require('whatwg-fetch');
import Waifu2x from 'waifu2x-tfjs';
let React = require('react');
let ReactDOM = require('react-dom');
let SettingControl = require('./setting-control.jsx');
let ImageViewer = require('./image-viewer.jsx');
let Icon = require('./icon.jsx');
let Progress = require('./progress.jsx');

const ROOT = 'https://cdn.rawgit.com/nagadomi/waifu2x/7f6af49d';
const MODEL_DIR = `${ROOT}/models/vgg_7`;
const ARTWORK_DIR = `${MODEL_DIR}/art`;
const ARTWORK_Y_DIR = `${MODEL_DIR}/art_y`;
const PHOTOT_DIR = `${MODEL_DIR}/photo`;

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      imageSrc: null,
      imageWidth: 256,
      imageHeight: 256,
      isCalculating: false,
      isCalculated: false,
      isDisplayCalculated: false,
      calculatedImageSrc: null,
      calculatedImageWidth: null,
      calculatedImageHeight: null,
      filename: null,
      memory: 512,
      scale: 1, // Actual scaling ratio
      scaleNumber: 0, // 0 or 1 or 2
      scaleDescription: 'None', // 'None' or '1.6x' or '2.0x'
      denoisingLevelNumber: 3, // 0 or 1 or 2 or 3
      denoisingLevelDescription: 'Highest', // 'None' or 'Low' or 'High' or 'Highest'
      imageType: 'Artwork_y', // 'Artwork' or 'Artwork_y' or 'Photo'
      calculatingScaleDescription: '',
      calculatingDenoisingLevelDescription: '',
      calculatingImageType: '',
      doneRatio: 0,
      progressMessage: ''
    };
  }
  updateScale = scaleNumber => {
    // Not allowed to execute with 1x && no denoising
    if (scaleNumber == 0) {
      this.updateDenoisingLevel(
        this.state.denoisingLevelNumber ? this.state.denoisingLevelNumber : 1
      );
    } else {
      this.updateDenoisingLevel(this.state.denoisingLevelNumber);
    }
    this.setState({ scaleNumber: scaleNumber });
    if (scaleNumber == 0) {
      this.setState({ scale: 1, scaleDescription: 'None' }, () => {
        document.getElementById('slider-1').MaterialSlider.change('0'); // workaround for Material Design Lite
      });
    } else if (scaleNumber == 1) {
      this.setState({ scale: 1.6, scaleDescription: '1.6x' }, () => {
        document.getElementById('slider-1').MaterialSlider.change('1'); // workaround for Material Design Lite
      });
    } else if (scaleNumber == 2) {
      this.setState({ scale: 2, scaleDescription: '2.0x' }, () => {
        document.getElementById('slider-1').MaterialSlider.change('2'); // workaround for Material Design Lite
      });
    }
  };
  updateDenoisingLevel = denoisingLevelNumber => {
    this.setState({ denoisingLevelNumber: denoisingLevelNumber });
    if (denoisingLevelNumber == 0) {
      this.setState({ denoisingLevelDescription: 'None' }, () => {
        document.getElementById('slider-2').MaterialSlider.change('0'); // workaround for Material Design Lite
      });
    } else if (denoisingLevelNumber == 1) {
      this.setState({ denoisingLevelDescription: 'Low' }, () => {
        document.getElementById('slider-2').MaterialSlider.change('1'); // workaround for Material Design Lite
      });
    } else if (denoisingLevelNumber == 2) {
      this.setState({ denoisingLevelDescription: 'High' }, () => {
        document.getElementById('slider-2').MaterialSlider.change('2'); // workaround for Material Design Lite
      });
    } else if (denoisingLevelNumber == 3) {
      this.setState({ denoisingLevelDescription: 'Highest' }, () => {
        document.getElementById('slider-2').MaterialSlider.change('3'); // workaround for Material Design Lite
      });
    }
  };
  updateMemory = memory => {
    this.setState({ memory: memory });
  };
  updateImageType = imageType => {
    this.setState({ imageType: imageType });

    // Reset to default parameters (1x && no denoising)
    this.updateScale(0);
    this.updateDenoisingLevel(3);
  };
  updateFile = file => {
    // Workaround for Material Design Lite
    document.getElementById('progress').MaterialProgress.setProgress(0);

    this.setState({
      isCalculating: false,
      isCalculated: false,
      isDisplayCalculated: false
    });

    let urlCreator = window.URL || window.webkitURL;
    let imageDataURL = urlCreator.createObjectURL(file);
    this.setState({ imageSrc: imageDataURL, filename: file.name }, () => {
      let imgNode = ReactDOM.findDOMNode(this.refs.hiddenImage);
      imgNode.onload = () => {
        let canvasNode = ReactDOM.findDOMNode(this.refs.hiddenCanvas);
        this.setState(
          {
            imageWidth: imgNode.naturalWidth,
            imageHeight: imgNode.naturalHeight
          },
          () => {
            let context = canvasNode.getContext('2d');
            let image = new Image();
            image.onload = () => {
              context.clearRect(0, 0, canvasNode.width, canvasNode.height);
              context.drawImage(
                image,
                0,
                0,
                canvasNode.width,
                canvasNode.height
              );
            };
            image.src = this.state.imageSrc;
          }
        );
      };
      imgNode.src = this.state.imageSrc;
    });
  };
  handleStartClick = () => {
    // Workaround for Material Design Lite
    document.getElementById('progress').MaterialProgress.setProgress(0);

    if (this.state.imageSrc == null) {
      return;
    }

    this.setState({
      isCalculating: true,
      isCalculated: false,
      isDisplayCalculated: false,
      doneRatio: 0,
      doneBlocks: 0,
      allBlocks: 0,
      calculatingScaleDescription: this.state.scaleDescription,
      calculatingDenoisingLevelDescription: this.state
        .denoisingLevelDescription,
      calculatingImageType: this.state.imageType,
      progressMessage: 'Loading model files'
    });

    let model_paths = [];
    let t_dir;
    switch (this.state.imageType) {
      case 'Artwork':
        t_dir = ARTWORK_DIR;
        break;
      case 'Artwork_y':
        t_dir = ARTWORK_Y_DIR;
        break;
      case 'Photo':
        t_dir = PHOTOT_DIR;
      default:
        break;
    }
    this.state.denoisingLevelNumber &&
      model_paths.push(
        `${t_dir}/noise${this.state.denoisingLevelNumber}_model.json`
      );
    this.state.scaleNumber == 2 &&
      model_paths.push(`${t_dir}/scale2.0x_model.json`);

    Waifu2x(model_paths, { backend: this.state.memory ? 'webgl' : 'cpu' })
      .then(waifu2x => {
        console.log('All model files are loaded');
        const max_size =
          (this.state.memory ? (32 * this.state.memory) / 512 : 32) /
          (this.state.scaleNumber == 2 ? 2 : 1);
        let imgNode = ReactDOM.findDOMNode(this.refs.hiddenImage);
        let calculatedCanvasNode = ReactDOM.findDOMNode(
          this.refs.calculatedHiddenCanvas
        );
        let calculatedContext = calculatedCanvasNode.getContext('2d');
        let width, height, c_w, c_h;
        if (this.state.scaleNumber == 1) {
          width = parseInt(this.state.imageWidth * 1.6);
          height = parseInt(this.state.imageHeight * 1.6);
        } else {
          width = this.state.imageWidth;
          height = this.state.imageHeight;
        }
        let canvasNode = document.createElement('canvas');
        canvasNode.width = width;
        canvasNode.height = height;
        let context = canvasNode.getContext('2d');
        context.drawImage(imgNode, 0, 0, width, height);

        if (this.state.scaleNumber == 2) {
          c_w = width * 2;
          c_h = height * 2;
        } else {
          c_w = width;
          c_h = height;
        }
        this.setState(
          { calculatedImageWidth: c_w, calculatedImageHeight: c_h },
          () => {
            calculatedContext.clearRect(0, 0, c_w, c_h);

            calculatedContext.globalAlpha = 0.5;
            calculatedContext.beginPath();
            calculatedContext.drawImage(imgNode, 0, 0, c_w, c_h);
            calculatedContext.closePath();
            calculatedContext.save();
            calculatedContext.globalAlpha = 1.0;

            const margin = 6;
            const i_s =
              height % max_size
                ? parseInt(height / max_size) + 1
                : parseInt(height / max_size);
            const j_s =
              width % max_size
                ? parseInt(width / max_size) + 1
                : parseInt(width / max_size);
            const process_fn = async () => {
              for (let i = 0; i * max_size < height; i++) {
                let s_y = i * max_size;
                let m_y = s_y - margin;
                let s_h = max_size;
                let m_h = s_h + margin * 2;
                if ((i + 1) * max_size - height > 0) {
                  s_h = height - s_y;
                }
                for (let j = 0; j * max_size < width; j++) {
                  let s_x = j * max_size;
                  let m_x = s_x - margin;
                  let s_w = max_size;
                  let m_w = s_w + margin * 2;
                  if ((j + 1) * max_size - width > 0) {
                    s_w = width - s_x;
                  }
                  let t_canvas = document.createElement('canvas');
                  let t_ctx = t_canvas.getContext('2d');
                  t_canvas.width = m_w;
                  t_canvas.height = m_h;
                  let s_imgData = context.getImageData(m_x, m_y, m_w, m_h);
                  t_ctx.putImageData(s_imgData, 0, 0);

                  let img_src = await waifu2x.generate(
                    t_canvas,
                    0,
                    this.state.denoisingLevelNumber > 0
                  );
                  let img = await new Promise((resolve, reject) => {
                    let _img = new Image();
                    _img.onload = () => {
                      resolve(_img);
                    };
                    _img.onerror = e => {
                      reject(e);
                    };
                    _img.src = img_src;
                  });
                  if (
                    this.state.denoisingLevelNumber > 0 &&
                    this.state.scaleNumber == 2
                  ) {
                    img_src = await waifu2x.generate(img, 1, false);
                    img = await new Promise((resolve, reject) => {
                      let _img = new Image();
                      _img.onload = () => {
                        resolve(_img);
                      };
                      _img.onerror = e => {
                        reject(e);
                      };
                      _img.src = img_src;
                    });
                  }
                  if (this.state.scaleNumber == 2) {
                    calculatedContext.clearRect(
                      s_x * 2,
                      s_y * 2,
                      s_w * 2,
                      s_h * 2
                    );
                    calculatedContext.drawImage(
                      img,
                      margin * 2,
                      margin * 2,
                      s_w * 2,
                      s_h * 2,
                      s_x * 2,
                      s_y * 2,
                      s_w * 2,
                      s_h * 2
                    );
                  } else {
                    calculatedContext.clearRect(s_x, s_y, s_w, s_h);
                    calculatedContext.drawImage(
                      img,
                      margin,
                      margin,
                      s_w,
                      s_h,
                      s_x,
                      s_y,
                      s_w,
                      s_h
                    );
                  }

                  let doneRatio = parseInt(
                    ((i * j_s + j + 1) / (i_s * j_s)) * 100
                  );
                  if (doneRatio < 0) doneRatio = 0;
                  if (doneRatio > 100) doneRatio = 100;
                  this.setState({
                    isCalculating: true,
                    isCalculated: false,
                    isDisplayCalculated: true,
                    calculatedImageSrc: calculatedCanvasNode.toDataURL(),
                    doneRatio: doneRatio,
                    progressMessage: 'Progress the Image'
                  });
                }
              }
              this.setState({
                isCalculating: false,
                isCalculated: true,
                isDisplayCalculated: true,
                calculatedImageSrc: calculatedCanvasNode.toDataURL()
              });
              waifu2x.tidy();
            };
            process_fn();
          }
        );
      })
      .catch(e => {
        console.log(e, 'Failed to load model files');
        this.setState({
          isCalculating: false,
          isCalculated: false,
          isDisplayCalculated: false
        });
      });
  };
  handleCancelClick = () => {
    this.setState({ progressMessage: 'Cancel operation is disable.' });
  };
  handleCompareClick = () => {
    this.setState({ isDisplayCalculated: !this.state.isDisplayCalculated });
  };
  getStyle() {
    return {
      global: {
        fontFamily: 'Roboto, sans-serif',
        fontSize: '13px',
        lineHeight: '20px',
        backgroundColor: '#f3f3f3',
        minHeight: '100%'
      },
      headerTitle: {
        paddingLeft: '40px'
      },
      title: {
        color: 'rgb(255, 255, 255)',
        fontFamily: 'RobotoDraft, Roboto, sans-serif',
        fontSize: '24px',
        fontWeight: 'normal',
        textDecoration: 'none',
        WebkitFontSmoothing: 'antialiased'
      },
      navigationLink: {
        color: 'rgba(255, 255, 255, 1)',
        textDecoration: 'none',
        fontSize: '14px'
      },
      content: {
        color: 'rgb(117, 117, 117)'
      },
      progressCard: {
        marginBottom: '16px',
        display: this.state.isCalculating ? '' : 'none'
      },
      imageViewerCard: {
        marginBottom: '16px',
        display: this.state.imageSrc ? '' : 'none'
      },
      hiddenImage: {
        display: 'none'
      },
      hiddenCanvas: {
        display: 'none'
      },
      calculatedHiddenCanvas: {
        display: 'none'
      }
    };
  }
  render() {
    let style = this.getStyle();
    return (
      <div
        style={style.global}
        className="mdl-layout mdl-js-layout mdl-layout--fixed-header"
      >
        <header className="mdl-layout__header mdl-layout__header--scroll">
          <div style={style.headerTitle} className="mdl-layout__header-row">
            <a href="../" style={style.title}>
              <span>waifu2x-tfjs</span>
            </a>
            <div className="mdl-layout-spacer" />
            <nav className="mdl-navigation">
              <a
                href="https://github.com/HighCWu/waifu2x-tfjs"
                style={style.navigationLink}
              >
                <Icon iconType="link" /> GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="mdl-layout__content" style={style.content}>
          <div className="page-content">
            <main className="mdl-grid">
              <div className="mdl-cell mdl-cell--4-col mdl-cell--12-col-tablet">
                <SettingControl
                  filename={this.state.filename}
                  memory={this.state.memory}
                  onMemoryChange={this.updateMemory}
                  scale={this.state.scale}
                  scaleNumber={this.state.scaleNumber}
                  onScaleChange={this.updateScale}
                  scaleDescription={this.state.scaleDescription}
                  denoisingLevelNumber={this.state.denoisingLevelNumber}
                  onDenoisingLevelChange={this.updateDenoisingLevel}
                  denoisingLevelDescription={
                    this.state.denoisingLevelDescription
                  }
                  imageType={this.state.imageType}
                  onImageTypeChange={this.updateImageType}
                  onFileSelected={this.updateFile}
                  handleStartClick={this.handleStartClick}
                />
                <img ref="hiddenImage" style={style.hiddenImage} />
                <canvas
                  ref="hiddenCanvas"
                  style={style.hiddenCanvas}
                  width={this.state.imageWidth}
                  height={this.state.imageHeight}
                />
                <canvas
                  ref="calculatedHiddenCanvas"
                  style={style.calculatedHiddenCanvas}
                  width={this.state.calculatedImageWidth}
                  height={this.state.calculatedImageHeight}
                />
              </div>
              <div className="mdl-cell mdl-cell--8-col mdl-cell--12-col-tablet">
                <div style={style.progressCard}>
                  <Progress
                    scale={this.state.scale}
                    imageWidth={this.state.imageWidth}
                    imageHeight={this.state.imageHeight}
                    handleCancelClick={this.handleCancelClick}
                    filename={this.state.filename}
                    calculatingImageType={this.state.calculatingImageType}
                    calculatingScaleDescription={
                      this.state.calculatingScaleDescription
                    }
                    calculatingDenoisingLevelDescription={
                      this.state.calculatingDenoisingLevelDescription
                    }
                    doneRatio={this.state.doneRatio}
                    progressMessage={this.state.progressMessage}
                  />
                </div>
                <div style={style.imageViewerCard}>
                  <ImageViewer
                    scale={this.state.scale}
                    imageSrc={this.state.imageSrc}
                    filename={this.state.filename}
                    imageWidth={this.state.imageWidth}
                    imageHeight={this.state.imageHeight}
                    calculatedImageSrc={this.state.calculatedImageSrc}
                    calculatedImageWidth={this.state.calculatedImageWidth}
                    calculatedImageHeight={this.state.calculatedImageHeight}
                    isCalculating={this.state.isCalculating}
                    isCalculated={this.state.isCalculated}
                    isDisplayCalculated={this.state.isDisplayCalculated}
                    handleCompareClick={this.handleCompareClick}
                  />
                </div>
              </div>
            </main>
          </div>
        </main>
      </div>
    );
  }
}

module.exports = Main;
