import{u as i,P as e}from"./vendor.d6efebca.js";const n={};i({testCallback(i){i(.5)},async init(i){null===i||i in n||(n[i]=new e(i))},async predict(i,e){return null===i?e:(i in n||await this.init(i),await n[i].predict(e,-1===i.indexOf("scale2.0x_model.")))},async listenToModelDownloadProgress(i,e=(i=>{})){null!==i&&(i in n||await this.init(i),n[i].listenToModelDownloadProgress(e))},async listenToModelPredictProgress(i,e=(i=>{})){null!==i&&(i in n||await this.init(i),n[i].listenToModelPredictProgress(e))},async destroy(i){if(null===i||!(i in n))return image;n[i].destroy(),delete n[id]}});