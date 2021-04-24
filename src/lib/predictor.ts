import * as tf from '@tensorflow/tfjs';
import * as tf_webgl from '@tensorflow/tfjs-backend-webgl';
import fetchProgress from 'fetch-progress';

import { Image } from './image';

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
  private _moduleList: Array<tf.layers.Layer> = [];
  /** @hidden */
  private _moduleInputChannelList: Array<number> = [];
  /** @hidden */
  private _blockSize = 32;
  /** @hidden */
  private _blockSizeEx = 34;

  /**
   * Construct a new `Predictor` for Waifu2X prediction.
   * @param modelUrl - Json url path of Waifu2X weights.
   * @param blockSize - The size of a single block when dividing an image into multiple blocks for processing
   */
  constructor(modelUrl: string, blockSize = 32) {
    this._blockSize = blockSize;
    this._blockSizeEx = blockSize + 2;
    this._modelFetchPromise = new Promise<void>((resolve, reject) => {
      fetch(modelUrl)
        .then(
          fetchProgress({
            onProgress: (progress) => {
              this._modelFetchProgress = Math.max(
                0,
                progress.transferred / progress.total - 0.001
              );
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
    for (const param of this._params) {
      const layer = tf.layers.conv2d({
        filters: param.nOutputPlane,
        kernelSize: [param.kH, param.kW],
        kernelInitializer: 'zeros',
        padding: 'valid',
        useBias: true,
      });
      layer.trainable = false;
      this._moduleList.push(layer);
      this._moduleList.push(tf.layers.leakyReLU({ alpha: 0.1 }));
      this._moduleInputChannelList.push(param.nInputPlane);
    }
    this._moduleList.pop();
    this._initialized = true;
  }

  /** @hidden */
  async _divideAndConquer(
    layer: tf.layers.Layer,
    input: tf.Tensor4D
  ): Promise<tf.Tensor4D> {
    if (layer.getClassName() === 'Conv2D') {
      const height = input.shape[1] === null ? 1 : input.shape[1];
      const width = input.shape[2] === null ? 1 : input.shape[2];
      const padH =
        height % this._blockSize === 0
          ? 0
          : Math.ceil(height / this._blockSize) * this._blockSize - height;
      const padW =
        width % this._blockSize === 0
          ? 0
          : Math.ceil(width / this._blockSize) * this._blockSize - width;
      const x = tf.mirrorPad(
        input,
        [
          [0, 0],
          [1, padH + 1],
          [1, padW + 1],
          [0, 0],
        ],
        'reflect'
      );

      const height2 = x.shape[1];
      const width2 = x.shape[2];

      const stepProgress =
        1 /
          this._moduleList.length /
          (((height2 - 2) / this._blockSize) *
            ((width2 - 2) / this._blockSize)) -
        1e-9;

      const hList: Array<tf.Tensor4D> = [];
      for (let iHDiv = 0; iHDiv < (height2 - 2) / this._blockSize; ++iHDiv) {
        const wList: Array<tf.Tensor4D> = [];
        for (let iWDiv = 0; iWDiv < (width2 - 2) / this._blockSize; ++iWDiv) {
          const slc = x.slice(
            [0, iHDiv * this._blockSize, iWDiv * this._blockSize, 0],
            [1, this._blockSizeEx, this._blockSizeEx, x.shape[3]]
          );
          const wDiv = <tf.Tensor4D>layer.call(slc, {});
          slc.dispose();
          wList.push(wDiv);

          this._modelPredictProgress += stepProgress;
          this._modelPredictCallback(this._modelFetchProgress);
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

      return rlt;
    } else {
      const y = <tf.Tensor4D>layer.call(input, {});
      return y;
    }
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
    let x: tf.Tensor4D = tf.zeros([1, 1, 1, 1], 'float32');
    x.dispose();
    for (let idx = 0; idx < this._moduleList.length; ++idx) {
      this._modelPredictProgress = Math.max(
        0,
        idx / this._moduleList.length - 1e-9
      );
      this._modelPredictCallback(this._modelPredictProgress);
      const layer = this._moduleList[idx];
      const inputChannel = this._moduleInputChannelList[idx];
      if (idx === 0) {
        if (inputChannel === 1) {
          img.mode = 'YCbCr';
          const _x = img.tensor;
          const _x1 = _x.slice([0, 0, 0], [x.shape[0], x.shape[1], 1]);
          _x.dispose();
          x = _x1.expandDims(0);
          _x1.dispose();
        } else {
          const _x = img.tensor;
          x = _x.expandDims(0);
          _x.dispose();
        }
        if (!isNoise) {
          x = tf.image.resizeNearestNeighbor(x, [
            x.shape[1] * 2,
            x.shape[2] * 2,
          ]);
        }
      }
      if (!layer.built) {
        tf.tidy(() => {
          let t: tf.Tensor4D = tf.zeros(
            [1, this._blockSizeEx, this._blockSizeEx, inputChannel],
            'float32'
          );
          let idxSetWeight = 0;
          for (const _layer of this._moduleList) {
            _layer.build([this._blockSizeEx, this._blockSizeEx, t.shape[3]]);
            t = <tf.Tensor4D>_layer.call(t, {});
            t = tf.zeros(
              [1, this._blockSizeEx, this._blockSizeEx, t.shape[3]],
              'float32'
            );
            if (_layer.getClassName() === 'Conv2D') {
              _layer.setWeights([
                tf
                  .tensor(this._params[idxSetWeight].weight)
                  .transpose([2, 3, 1, 0]),
                tf.tensor(this._params[idxSetWeight].bias),
              ]);
              idxSetWeight++;
            }
          }
        });
      }
      const _x = x;
      x = await this._divideAndConquer(layer, x);
      _x.dispose();
    }
    img.tensor = tf.tidy(() => {
      let imgTensor: tf.Tensor3D = img.tensor;
      const _x = x;
      const y = <tf.Tensor3D>x.clipByValue(0, 1).squeeze([0]);
      _x.dispose();
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
    for (const layer of this._moduleList) {
      layer.dispose();
    }
  }
}
