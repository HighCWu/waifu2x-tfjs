import modelUrlArtNoise0 from './art/noise0_model.json?url'
import modelUrlArtNoise1 from './art/noise1_model.json?url'
import modelUrlArtNoise2 from './art/noise2_model.json?url'
import modelUrlArtNoise3 from './art/noise3_model.json?url'
import modelUrlArtScale2 from './art/scale2.0x_model.json?url'
import modelUrlArtYNoise1 from './art_y/noise1_model.json?url'
import modelUrlArtYNoise2 from './art_y/noise2_model.json?url'
import modelUrlArtYNoise3 from './art_y/noise3_model.json?url'
import modelUrlArtYScale2 from './art_y/scale2.0x_model.json?url'
import modelUrlPhotoNoise0 from './photo/noise0_model.json?url'
import modelUrlPhotoNoise1 from './photo/noise1_model.json?url'
import modelUrlPhotoNoise2 from './photo/noise2_model.json?url'
import modelUrlPhotoNoise3 from './photo/noise3_model.json?url'
import modelUrlPhotoScale2 from './photo/scale2.0x_model.json?url'


export const modelUrls = {
  art: {
    noise: {
      'Null': null,
      'Low': modelUrlArtNoise0.replace('./', window.location.href.split('index.html')[0]),
      'Middle': modelUrlArtNoise1.replace('./', window.location.href.split('index.html')[0]),
      'High': modelUrlArtNoise2.replace('./', window.location.href.split('index.html')[0]),
      'Highest': modelUrlArtNoise3.replace('./', window.location.href.split('index.html')[0])
    },
    scale: {
      '1x': null,
      '2x': modelUrlArtScale2.replace('./', window.location.href.split('index.html')[0])
    }
  },
  art_y: {
    noise: {
      'Null': null,
      'Low': modelUrlArtYNoise1.replace('./', window.location.href.split('index.html')[0]),
      'Middle': modelUrlArtYNoise2.replace('./', window.location.href.split('index.html')[0]),
      'High': modelUrlArtYNoise3.replace('./', window.location.href.split('index.html')[0]),
    },
    scale: {
      '1x': null,
      '2x': modelUrlArtYScale2.replace('./', window.location.href.split('index.html')[0])
    }
  },
  photo: {
    noise: {
      'Null': null,
      'Low': modelUrlPhotoNoise0.replace('./', window.location.href.split('index.html')[0]),
      'Middle': modelUrlPhotoNoise1.replace('./', window.location.href.split('index.html')[0]),
      'High': modelUrlPhotoNoise2.replace('./', window.location.href.split('index.html')[0]),
      'Highest': modelUrlPhotoNoise3.replace('./', window.location.href.split('index.html')[0])
    },
    scale: {
      '1x': null,
      '2x': modelUrlPhotoScale2.replace('./', window.location.href.split('index.html')[0])
    }
  }
}
