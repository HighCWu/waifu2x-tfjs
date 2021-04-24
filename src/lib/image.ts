import * as tf from '@tensorflow/tfjs';

/**
 * This class is used to import image into `tf.Tensor`, export `tf.Tensor`
 * as an image and convert image tensor color space.
 */
export class Image {
  /** @hidden */
  private _initialized = false;
  /** @hidden */
  private _initializingPromise: Promise<void>;
  /** @hidden */
  private _image: tf.Tensor3D;
  /** @hidden */
  private _mode = 'RGB';

  /**
   * Construct a new Image instance.
   * @param image - Image coding as ImageBitMap with RGB color space.
   * @param mode - Image target color space for tensor computing.
   */
  constructor(image: ImageBitmap, mode = 'RGB') {
    this._image = tf.tensor3d([[[0]]]);
    this._initializingPromise = new Promise<void>((resolve) => {
      const fn = async () => {
        const t = await tf.browser.fromPixelsAsync(image);
        this._image = tf.tidy(() => {
          return <tf.Tensor3D>t.asType('float32').div(255.0);
        });
        t.dispose();
        this._initialized = true;
        resolve();
      };
      fn();
    });
    this.mode = mode;
  }

  /**
   * Whether the image is ready to operate.
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Wait until the image if ready to operate.
   * ```ts
   * import { Image } from 'waifu2x-tfjs';
   *
   * async function example() {
   *   const img = new Image(anImageBitMap');
   *   if (!img.initialized) await img.waitForReader();
   * }
   * example();
   * ```
   * @returns
   */
  async waitForReader() {
    if (this._initialized) return;
    else await this._initializingPromise;
  }

  /**
   * The color space of current `Image` instance.
   */
  get mode(): string {
    return this._mode;
  }

  set mode(mode: string) {
    if (this._mode === mode) return;
    if (this._mode === 'RGB' && mode === 'YCbCr')
      this._image = Image.rgbToYcbcr(this._image as tf.Tensor3D);
    else if (this._mode === 'YCbCr' && mode === 'RGB')
      this._image = Image.ycbcrToRgb(this._image as tf.Tensor3D);
    else return;
    this._mode = mode;
  }

  /**
   * Inner `tf.Tensor` instance of current `Image` instance.
   */
  get tensor(): tf.Tensor3D {
    return this._image.clone();
  }

  set tensor(tensor: tf.Tensor3D) {
    this._image.dispose();
    this._image = tensor;
  }

  /**
   * a promise that resolves when inner tensor could be export as an image.
   */
  get image(): Promise<ImageBitmap> {
    const tensor: tf.Tensor3D = tf.tidy(() => {
      let tensor: tf.Tensor3D = this.tensor;
      if (this._mode === 'YCbCr') tensor = Image.ycbcrToRgb(tensor);
      return <tf.Tensor3D>tensor.clipByValue(0, 1).mul(255.0).asType('int32');
    });
    const parseTensor = async () => {
      const array: Uint8ClampedArray = await tf.browser.toPixels(tensor);
      const imageData: ImageData = new ImageData(
        array,
        tensor.shape[1],
        tensor.shape[0]
      );
      return createImageBitmap(imageData);
    };

    return parseTensor();
  }

  /**
   *
   * @param image - RGB Image to be converted to YCbCr with shape `(H, W, 3)`.
   * @returns YCbCr version of the image with shape `(H, W, 3)`.
   */
  static rgbToYcbcr(image: tf.Tensor3D): tf.Tensor3D {
    return tf.tidy(() => {
      const r: tf.Tensor3D = image.slice(
        [0, 0, 0],
        [image.shape[0], image.shape[1], 1]
      );
      const g: tf.Tensor3D = image.slice(
        [0, 0, 1],
        [image.shape[0], image.shape[1], 1]
      );
      const b: tf.Tensor3D = image.slice(
        [0, 0, 2],
        [image.shape[0], image.shape[1], 1]
      );

      const delta = 0.5;

      const y: tf.Tensor3D = r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114));
      const cb: tf.Tensor3D = b.sub(y).mul(0.564).add(delta);
      const cr: tf.Tensor3D = r.sub(y).mul(0.713).add(delta);

      return tf.concat([y, cb, cr], -1);
    });
  }

  /**
   *
   * @param image - YCbCr Image to be converted to RGB with shape `(H, W, 3)`.
   * @returns RGB version of the image with shape `(H, W, 3)`.
   */
  static ycbcrToRgb(image: tf.Tensor3D): tf.Tensor3D {
    return tf.tidy(() => {
      const y: tf.Tensor3D = image.slice(
        [0, 0, 0],
        [image.shape[0], image.shape[1], 1]
      );
      const cb: tf.Tensor3D = image.slice(
        [0, 0, 1],
        [image.shape[0], image.shape[1], 1]
      );
      const cr: tf.Tensor3D = image.slice(
        [0, 0, 2],
        [image.shape[0], image.shape[1], 1]
      );

      const delta = 0.5;
      const cbShifted: tf.Tensor3D = cb.sub(delta);
      const crShifted: tf.Tensor3D = cr.sub(delta);

      const r: tf.Tensor3D = y.add(crShifted.mul(1.403));
      const g: tf.Tensor3D = y
        .sub(crShifted.mul(0.714))
        .sub(cbShifted.mul(0.344));
      const b: tf.Tensor3D = y.add(cbShifted.mul(1.773));

      return tf.concat([r, g, b], -1);
    });
  }

  /**
   * Memory used by `tf.Tensor` in the `Image` instance can not be free automatically,
   * call this if the instance won't be used;
   */
  destroy() {
    tf.dispose(this._image);
  }
}
