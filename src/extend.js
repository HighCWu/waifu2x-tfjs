import * as tf from '@tensorflow/tfjs';

Image.open = async (fp, mode='r') => {
    return await new Promise((resolve,reject) => {
        if(mode !== 'r') {
            reject(new Error(`bad mode ${r}`));
        }
        if(typeof(fp) === 'string') {
            let img = new Image();
            img.src = fp;
            img.onload = () => {
                let rlt = tf.fromPixels(img);
                document.body.removeChild(img);
                img = null;
                resolve(rlt);
            };
            img.onerror = e => {
                img = null;
                reject(e);
            };
            img.style.display = 'none';
            document.body.appendChild(img);
        } else {
            try {
                let img = tf.fromPixels(fp)
                resolve(img);
            } catch (e) {
                reject(e);
            }
        }
    });
}

tf.Tensor.prototype.mode = 'RGB';
tf.Tensor.prototype.setMode = function(mode) {
    this.mode = mode;
    return this;
}
tf.Tensor.prototype.convertToRGB = function() {
    return tf.tidy(()=>{
        const tensor = this.asType('float32');
        let rlt;
        switch (this.mode) {
            case 'RGB':
                rlt = this.clone();
                break;
    
            case 'YCbCr':
                let y = tensor.slice([0, 0, 0], [tensor.shape[0], tensor.shape[1], 1]);
                let cb = tensor.slice([0, 0, 1], [tensor.shape[0], tensor.shape[1], 1]);
                let cr = tensor.slice([0, 0, 2], [tensor.shape[0], tensor.shape[1], 1]);
                let r = y.add(tf.scalar(-16)).mul(tf.scalar(1.164))
                            .add(
                                cr.add(tf.scalar(-128)).mul(tf.scalar(1.596))
                            )
                let g = y.add(tf.scalar(-16)).mul(tf.scalar(1.164))
                            .add(
                                cb.add(tf.scalar(-128)).mul(tf.scalar(-0.392))
                            )
                            .add(
                                cr.add(tf.scalar(-128)).mul(tf.scalar(-0.813))
                            )
                let b = y.add(tf.scalar(-16)).mul(tf.scalar(1.164))
                            .add(
                                cb.add(tf.scalar(-128)).mul(tf.scalar(2.017))
                            )
                rlt = tf.stack([r,g,b],-1).reshape([tensor.shape[0],tensor.shape[1],3]).clipByValue(0, 255);
                break;
        
            default:
                break;
        }
        
        if(rlt) {
            rlt.mode = 'RGB';
        }
        return rlt; // default 'float32'
    })
};
tf.Tensor.prototype.convert = function(mode) {
    return tf.tidy(()=>{
        if(this.mode === mode) {
            return this.clone();
        } else {
            const tensor = this.convertToRGB().asType('float32');
            let rlt;
            switch (mode) {
                case 'RGB':
                    rlt = tensor;
                    break;
    
                case 'YCbCr':
                    let r = tensor.slice([0, 0, 0], [tensor.shape[0], tensor.shape[1], 1]);
                    let g = tensor.slice([0, 0, 1], [tensor.shape[0], tensor.shape[1], 1]);
                    let b = tensor.slice([0, 0, 2], [tensor.shape[0], tensor.shape[1], 1]);
                    let y = r.mul(tf.scalar(0.257))
                                    .add(g.mul(tf.scalar(0.564)))
                                    .add(b.mul(tf.scalar(0.098))
                                    .add(tf.scalar(16)));
                    let cb = r.mul(tf.scalar(-0.148))
                                    .add(g.mul(tf.scalar(-0.291)))
                                    .add(b.mul(tf.scalar(0.439))
                                    .add(tf.scalar(128)));
                    let cr = r.mul(tf.scalar(0.439))
                                    .add(g.mul(tf.scalar(-0.368)))
                                    .add(b.mul(tf.scalar(-0.071))
                                    .add(tf.scalar(128)));
                    rlt = tf.stack([y,cb,cr],-1).reshape([tensor.shape[0],tensor.shape[1],3]);
                    break;
            
                default:
                    break;
            }
    
            if(rlt) {
                rlt.mode = mode;
            }
            return rlt; // default 'float32'
        }
    })
};

export {
    tf, Image
}