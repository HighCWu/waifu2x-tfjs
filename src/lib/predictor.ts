import * as tf from '@tensorflow/tfjs';
import * as tf_webgl from '@tensorflow/tfjs-backend-webgl';
import fetchProgress from 'fetch-progress';

import { Image } from './image';

// Some browsers still do not support off-screen canvas,
// so make some compatibility judgments.
// However, if there is no off-screen canvas supported,
// the library cannot be run under a web worker.
if (self.OffscreenCanvas !== undefined) {
  const canvas = new OffscreenCanvas(320, 200);
  let context = canvas.getContext('webgl2') as
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null;
  if (!context) {
    context = canvas.getContext('webgl');
    if (context) tf_webgl.setWebGLContext(1, context as WebGLRenderingContext);
  } else {
    tf_webgl.setWebGLContext(2, context as WebGL2RenderingContext);
  }
}

class ParamsObject {
  nInputPlane = 0;
  nOutputPlane = 0;
  kH = 0;
  kW = 0;
  weight: Array<never> = [];
  bias: Array<never> = [];
}

/**
 * This class can load Waifu2X json weights and do the prediction job.
 */
export class Predictor {
  /** @hidden */
  private _initialized = false;
  /** @hidden */
  private _modelFetchProgress = 0;
  /** @hidden */
  private _modelFetchPromise: Promise<void>;
  /** @hidden */
  private _modelFetchCallback: (ratio: number) => void = () => {
    return;
  };
  /** @hidden */
  private _modelPredictProgress = 0;
  /** @hidden */
  private _modelPredictCallback: (ratio: number) => void = () => {
    return;
  };
  /** @hidden */
  private _params: Array<ParamsObject> = [];
  /** @hidden */
  private _model: tf.LayersModel | null = null;
  /** @hidden */
  private _blockSize = 0;
  /** @hidden */
  private _blockSizeEx = 0;

  /**
   * Construct a new `Predictor` for Waifu2X prediction.
   * @param modelUrl - Json url path of Waifu2X weights.
   * @param blockSize - The size of a single block when dividing an image into multiple blocks for processing
   */
  constructor(modelUrl: string, blockSize = 32) {
    this._blockSize = this._blockSizeEx = blockSize;
    this._modelFetchPromise = new Promise<void>((resolve, reject) => {
      fetch(modelUrl)
        .then(
          fetchProgress({
            onProgress: (progress) => {
              this._modelFetchProgress = Math.max(
                0,
                progress.transferred / progress.total - 0.001
              );
              // Sometimes, the compressed data will return the wrong file size,
              // making the progress more than 100%. So limit it.
              if (this._modelFetchProgress > 0.99)
                this._modelFetchProgress = 0.99;
              this._modelFetchCallback(this._modelFetchProgress);
            },
            onError: (e) => {
              reject(e);
            },
          })
        )
        .then((res) => res.json())
        .then((params) => {
          this._params = params;
          this._modelFetchProgress = 1;
          this._modelFetchCallback(this._modelFetchProgress);
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  /**
   * Set a listener which will be called when the model download progress changed.
   * @param callback
   */
  listenToModelDownloadProgress(callback: (ratio: number) => void) {
    this._modelFetchCallback = callback;
  }

  /**
   * Set a listener which will be called when the model predict progress changed.
   * @param callback
   */
  listenToModelPredictProgress(callback: (ratio: number) => void) {
    this._modelPredictCallback = callback;
  }

  /** @hidden */
  private _loadModel() {
    this._blockSizeEx = this._blockSize + (this._params.length + 1) * 2;
    const input = tf.layers.input({
      shape: [
        this._blockSizeEx,
        this._blockSizeEx,
        this._params[0].nInputPlane,
      ],
      dtype: 'float32',
    });
    let out = input;
    for (let i = 0; i < this._params.length; ++i) {
      const param = this._params[i];
      const layer = tf.layers.conv2d({
        filters: param.nOutputPlane,
        kernelSize: [param.kH, param.kW],
        kernelInitializer: 'zeros',
        padding: 'same',
        weights: [
          tf.tensor(param.weight).transpose([2, 3, 1, 0]),
          tf.tensor(param.bias),
        ],
        useBias: true,
      });
      layer.trainable = false;
      out = <tf.SymbolicTensor>layer.apply(out);
      if (i + 1 != this._params.length) {
        out = <tf.SymbolicTensor>tf.layers.leakyReLU({ alpha: 0.1 }).apply(out);
      }
    }
    this._model = tf.model({ inputs: input, outputs: out });
    this._initialized = true;
  }

  /**
   * Apply Waifu2X to the input image.
   * @param image - The Image coding as ImageBitMap with RGB color space as the input of the Waifu2X task.
   * @param isNoise - To decrease noise or do super resolution job.
   * @returns
   */
  async predict(image: ImageBitmap, isNoise: boolean): Promise<ImageBitmap> {
    if (this._modelFetchProgress < 0.999999) await this._modelFetchPromise;
    this._modelPredictProgress = 0;
    this._modelPredictCallback(this._modelPredictProgress);
    if (!this._initialized) this._loadModel();
    const img: Image = new Image(image);
    if (!img.initialized) await img.waitForReader();

    const inputChannel = this._params[0].nInputPlane;
    let x: tf.Tensor4D | null;
    if (inputChannel === 1) {
      img.mode = 'YCbCr';
      const _x = <tf.Tensor3D>img.tensor;
      x = <tf.Tensor4D>_x.expandDims(0);
      _x.dispose();
    } else {
      const _x = img.tensor;
      x = <tf.Tensor4D>_x.expandDims(0);
      _x.dispose();
    }
    if (!isNoise) {
      x = tf.image.resizeNearestNeighbor(x, [x.shape[1] * 2, x.shape[2] * 2]);
    }

    const exValue = this._params.length + 1;
    const height = x.shape[1];
    const width = x.shape[2];
    const hNBlock = Math.ceil(x.shape[1] / this._blockSize);
    const wNBlock = Math.ceil(x.shape[2] / this._blockSize);
    const stepProgress = 1 / (hNBlock * wNBlock);
    const padH =
      this._blockSize -
      (x.shape[1] % this._blockSize === 0
        ? this._blockSize
        : x.shape[1] % this._blockSize) +
      exValue;
    const padW =
      this._blockSize -
      (x.shape[2] % this._blockSize === 0
        ? this._blockSize
        : x.shape[2] % this._blockSize) +
      exValue;
    const _x = x;
    x = tf.mirrorPad(
      x,
      [
        [0, 0],
        [exValue, padH],
        [exValue, padW],
        [0, 0],
      ],
      'reflect'
    );
    _x.dispose();

    const hList: Array<tf.Tensor4D> = [];
    for (let iHDiv = 0; iHDiv < hNBlock; ++iHDiv) {
      const wList: Array<tf.Tensor4D> = [];
      for (let iWDiv = 0; iWDiv < wNBlock; ++iWDiv) {
        const slc = x.slice(
          [0, iHDiv * this._blockSize, iWDiv * this._blockSize, 0],
          [1, this._blockSizeEx, this._blockSizeEx, x.shape[3]]
        );
        const wDiv = <tf.Tensor4D>(this._model as tf.LayersModel).predict(slc);
        slc.dispose();
        wList.push(
          wDiv.slice(
            [0, exValue, exValue, 0],
            [1, this._blockSize, this._blockSize, wDiv.shape[3]]
          )
        );
        wDiv.dispose();

        this._modelPredictProgress += stepProgress;
        this._modelPredictCallback(this._modelPredictProgress);
      }
      const hDiv = tf.concat(wList, 2);
      for (const tensor of wList) tensor.dispose();
      hList.push(hDiv);
    }

    x.dispose();
    const y = tf.concat(hList, 1);
    for (const tensor of hList) tensor.dispose();
    const rlt = y.slice([0, 0, 0, 0], [1, height, width, y.shape[3]]);
    y.dispose();

    img.tensor = tf.tidy(() => {
      let imgTensor: tf.Tensor3D = img.tensor;
      const y = <tf.Tensor3D>rlt.clipByValue(0, 1).squeeze([0]);
      if (img.mode === 'YCbCr') {
        if (!isNoise) {
          imgTensor = tf.image.resizeNearestNeighbor(imgTensor, [
            imgTensor.shape[0] * 2,
            imgTensor.shape[1] * 2,
          ]);
        }
        const cb: tf.Tensor3D = imgTensor.slice(
          [0, 0, 1],
          [imgTensor.shape[0], imgTensor.shape[1], 1]
        );
        const cr: tf.Tensor3D = imgTensor.slice(
          [0, 0, 2],
          [imgTensor.shape[0], imgTensor.shape[1], 1]
        );
        imgTensor = tf.concat([y, cb, cr], -1);
      } else {
        imgTensor = y;
      }
      return imgTensor;
    });
    const imageBitMap = await img.image;
    img.destroy();
    await tf.nextFrame();
    this._modelPredictProgress = 1;
    this._modelPredictCallback(this._modelPredictProgress);

    return imageBitMap;
  }

  /**
   * Memory used by `tf.Tensor` in the `tf.layers.Layer` instance can not be free automatically,
   * call this if the `Predictor` instance won't be used;
   */
  destroy() {
    this._initialized = false;
    this._modelFetchProgress = 0;
    this._modelPredictProgress = 0;
    this._model?.dispose();
  }
}
