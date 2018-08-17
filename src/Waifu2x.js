import { tf, Image } from './extend';

let model_paths_obj = {};

class _Waifu2x {

    constructor() {

    }

    async __init__(model_paths) {
        this.params = [];
        const await_loading =  (obj, index) => {
            return new Promise((resolve) => {
                if(obj[index] !== 'loading') {
                    resolve(obj[index]);
                } else {
                    const interval = setInterval(()=>{
                        if(obj[index] !== 'loading') {
                            resolve(obj[index]);
                            clearInterval(interval);
                        }
                    }, 1000)
                }
            });
        };
        if(typeof(model_paths) === 'string') {
            if(typeof(model_paths_obj[model_paths]) === 'undefined') {
                model_paths_obj[model_paths] = 'loading...';
                model_paths_obj[model_paths] = await (await fetch(model_paths)).json();
            }
            this.params.push(await await_loading(model_paths_obj,model_paths));
            return;
        }
        for(let path of model_paths) {
            if(typeof(model_paths_obj[path]) === 'undefined') {
                model_paths_obj[path] = 'loading...';
                model_paths_obj[path] = await (await fetch(path)).json();
            }
            this.params.push(await await_loading(model_paths_obj,path));
        }
    }

    _loadModel(input_shape, param_id) {
        const model = tf.sequential();
        model.add(tf.layers.conv2d({
            filters: this.params[param_id][0]['nOutputPlane'],
            kernelSize: [this.params[param_id][0]['kH'],this.params[param_id][0]['kW']],
            kernelInitializer: 'zeros',
            padding: 'same',
            weights: [tf.tensor(this.params[param_id][0]['weight']).transpose([2,3,1,0]), tf.tensor(this.params[param_id][0]['bias'])],
            useBias: true,
            inputShape: input_shape,
            dataFormat: 'channelsFirst'
        }));
        model.add(tf.layers.leakyReLU({alpha:0.1}))
        for(let i in this.params[param_id]) {
            if(i == 0) continue;  // i is 'string' type, use '==' but not '==='
            const param = this.params[param_id][i];
            model.add(tf.layers.conv2d({
                filters: param['nOutputPlane'],
                kernelSize: [param['kH'],param['kW']],
                kernelInitializer: 'zeros',
                padding: 'same',
                weights: [tf.tensor(param['weight']).transpose([2,3,1,0]), tf.tensor(param['bias'])],
                useBias: true,
                dataFormat: 'channelsFirst'
            }));
            model.add(tf.layers.leakyReLU({alpha:0.1}))
        }
        return model;
    }

    async _loadImageY(path, is_noise) {
        let im = await Image.open(path);
        im = tf.tidy(()=>{
            let _im = im.convert('YCbCr');
            tf.dispose(im);
            return _im;
        })

        im = tf.tidy(()=>{
            let _im;
            if(is_noise) {
                _im = im.asType('float32');
            } else {
                _im = tf.image.resizeNearestNeighbor(im, [im.shape[0]*2,im.shape[1]*2]).asType('float32');
            }
            tf.dispose(im);
            return _im;
        });
        
        
        let x = tf.tidy(()=>{
            return im.slice([0, 0, 0], [im.shape[0], im.shape[1], 1]).reshape([1, 1, im.shape[0], im.shape[1]]).div(tf.scalar(255.0));
        })
        
        return [im, x];

    }

    async _loadImageRGB(path, is_noise) {
        let im = await Image.open(path);

        im = tf.tidy(()=>{
            let _im;
            if(is_noise) {
                _im = im.asType('float32');
            } else {
                _im = tf.image.resizeNearestNeighbor(im, [im.shape[0]*2,im.shape[1]*2]).asType('float32');
            }
            tf.dispose(im);
            return _im;
        });

        let x = tf.tidy(()=>{
            let r = im.slice([0, 0, 0], [im.shape[0], im.shape[1], 1]);
            let g = im.slice([0, 0, 1], [im.shape[0], im.shape[1], 1]);
            let b = im.slice([0, 0, 2], [im.shape[0], im.shape[1], 1]);
            return tf.stack([r,g,b]).reshape([1, 3, im.shape[0], im.shape[1]]).div(tf.scalar(255.0));
        });
        
        return [im, x]

    }

    async generate(img_path, param_id=0, is_noise=false) {
        const input_channel = this.params[param_id][0]['nInputPlane'];
        
        if(!this.models) {
            this.models = []
            for(let i in this.params) {
                const t_input_channel = this.params[i][0]['nInputPlane'];
                this.models.push(this._loadModel([t_input_channel, null, null], i));
            }
        }
        // Define model from the image.
        let model = this.models[param_id];

        let im, x;
        // Loading image from img_path.
        if(input_channel === 1) {
            [im, x] = await this._loadImageY(img_path, is_noise);
        } else {
            [im, x] = await this._loadImageRGB(img_path, is_noise);
        }
        
        im = tf.tidy(()=>{
            let _im = im;// Generate new value.
            let y = model.predict(x);
    
            // Return value to image.
            if(input_channel === 1) {
                y = y.mul(tf.scalar(255.0)).clipByValue(0, 255).reshape([im.shape[0],im.shape[1], 1]);
                let cb = im.slice([0, 0, 1], [im.shape[0],im.shape[1], 1]);
                let cr = im.slice([0, 0, 2], [im.shape[0],im.shape[1], 1]);
                im = tf.stack([y,cb,cr],-1).reshape([im.shape[0],im.shape[1],3]);
                im = im.setMode('YCbCr').convert('RGB').asType('int32');
            } else {
                im = y.mul(tf.scalar(255.0)).clipByValue(0, 255);
                let r = im.slice([0, 0, 0, 0], [1, 1, im.shape[2], im.shape[3]]);
                let g = im.slice([0, 1, 0, 0], [1, 1, im.shape[2], im.shape[3]]);
                let b = im.slice([0, 2, 0, 0], [1, 1, im.shape[2], im.shape[3]]);
                im = tf.stack([r,g,b],-1).reshape([im.shape[2],im.shape[3], 3]);
                im = im.setMode('RGB').asType('int32');
            }
            tf.dispose(_im);
            return im;
        })
        

        let canvas = document.createElement('canvas');
        canvas.height = im.shape[0];
        canvas.width = im.shape[1];
        await tf.toPixels(im, canvas);
        im = canvas.toDataURL();
        canvas = null;

        return im;
    }

    tidy() {
        for(let model of this.models) {
            for (let layer of model.layers) {
                tf.dispose(layer.getWeights());
            }
        }
    }

}

export default async function Waifu2x(model_paths, config) {
    if(typeof(config) === 'object') {
        if(config.backend === 'cpu') {
            tf.setBackend('cpu');
        } else {
            tf.setBackend('webgl');
        }
    }
    const waifu2x = new _Waifu2x();
    await waifu2x.__init__(model_paths);
    return waifu2x;
}