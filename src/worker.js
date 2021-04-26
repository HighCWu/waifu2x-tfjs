import * as comlink from 'comlink'
import * as waifu2x from 'waifu2x-tfjs'


const predictorList = {}
comlink.expose({

  testCallback(callback) {
    callback(0.5);
  },
  
  async init(model_url) {
    if (model_url === null || model_url in predictorList) return;
    predictorList[model_url] = new waifu2x.Predictor(model_url)
  },

  async predict(model_url, image) {
    if (model_url === null) return image;
    if (!(model_url in predictorList)) await this.init(model_url)
    return await predictorList[model_url].predict(image, model_url.indexOf('scale2.0x_model.') === -1)
  },

  async listenToModelDownloadProgress(model_url, callback = ((ratio) => {})) {
    if (model_url === null) return;
    if (!(model_url in predictorList)) await this.init(model_url)
    predictorList[model_url].listenToModelDownloadProgress(callback)
  },

  async listenToModelPredictProgress(model_url, callback = ((ratio) => {})) {
    if (model_url === null) return;
    if (!(model_url in predictorList)) await this.init(model_url)
    predictorList[model_url].listenToModelPredictProgress(callback)
  },

  async destroy(model_url) {
    if (model_url === null || !(model_url in predictorList)) return image;
    predictorList[model_url].destroy()
    delete predictorList[id]
  }
})
