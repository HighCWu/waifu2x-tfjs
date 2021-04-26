<!--Refer to https://github.com/lian-yue/vue-upload-component/blob/master/docs/views/examples/Full.vue-->
<template>
<div class="example-full">

  <button type="button" class="btn btn-danger float-right btn-is-option" v-if="!$refs.upload || !$refs.upload.active" @click.prevent="isOption = !isOption">
    <i class="fa fa-cog" aria-hidden="true"></i>
    Options
  </button>
  <button type="button" class="btn btn-default float-right btn-is-option"  v-else>
    <i class="fa fa-spinner" aria-hidden="true"></i>
    Options
  </button>
  <button type="button" class="btn btn-primary float-right btn-is-option" @click.prevent="open('https://github.com/HighCWu/waifu2x-tfjs')">
    <i class="fa fa-github" aria-hidden="true"></i>
    Github
  </button>
  <h1 id="example-title" class="example-title">Waifu2X-tfjs Example</h1>

  <div v-show="$refs.upload && $refs.upload.dropActive" class="drop-active">
		<h3>Drop files to upload</h3>
  </div>
  <div class="upload" v-show="!isOption">
		<h5>Tap thumbnail image to show the full image</h5>
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>#</th>
            <th>Thumb</th>
            <th>Name</th>
            <th>Width</th>
            <th>Height</th>
            <!--th>Size</th>
            <th>Speed</th-->
            <th>Status</th>
            <th>Action</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!files.length">
            <td colspan="9">
              <div class="text-center p-5">
                <h4>Drop files anywhere to upload<br/>or</h4>
                <label :for="name" class="btn btn-lg btn-primary">Select Files</label>
              </div>
            </td>
          </tr>
          <tr v-for="(file, index) in files" :key="file.id">
            <td>{{index}}</td>
            <td>
              <img class="preview-img-item td-image-thumb" v-if="file.thumb" :src="file.thumb" @click="open(file.thumb)"  />
              <span v-else>No Image</span>
            </td>
            <td>
              <div class="filename">
                {{file.name}}
              </div>
              <div class="progress" v-if="file.active || file.progress !== '0.00'">
                <div :class="{'progress-bar': true, 'progress-bar-striped': true, 'bg-danger': file.error, 'progress-bar-animated': file.active}" role="progressbar" :style="{width: file.progress + '%'}">{{file.progress}}%</div>
              </div>
            </td>
            <td>{{file.width || 0}}</td>
            <td>{{file.height || 0}}</td>
            <!--td>{{$formatSize(file.size)}}</td>
            <td>{{$formatSize(file.speed)}}</td-->

            <td v-if="file.error">{{file.error}}</td>
            <td v-else-if="file.success">success</td>
            <td v-else-if="file.active">active</td>
            <td v-else></td>
            <td>
              <div class="btn-group">
                <button class="btn btn-secondary btn-sm dropdown-toggle" type="button">
                  Action
                </button>
                <div class="dropdown-menu">
                  <a :class="{'dropdown-item': true, disabled: file.active || file.success || file.error === 'compressing' || file.error === 'image parsing'}" href="#" @click.prevent="file.active || file.success || file.error === 'compressing' ? false :  onEditFileShow(file)">Edit</a>
                  <a :class="{'dropdown-item': true, disabled: !file.active}" href="#" @click.prevent="file.active ? $refs.upload.update(file, {error: 'cancel'}) : false" hidden>Cancel</a>

                  <a class="dropdown-item" href="#" v-if="file.active" @click.prevent="$refs.upload.update(file, {active: false})" hidden>Abort</a>
                  <a class="dropdown-item" href="#" v-else-if="file.error && file.error !== 'compressing' && file.error !== 'image parsing' && $refs.upload.features.html5" @click.prevent="$refs.upload.update(file, {active: true, error: '', progress: '0.00'})">Retry waifu2x</a>
                  <a :class="{'dropdown-item': true, disabled: file.success || file.error === 'compressing' || file.error === 'image parsing'}" href="#" v-else @click.prevent="file.success || file.error === 'compressing' || file.error === 'image parsing' ? false : $refs.upload.update(file, {active: true})">Waifu2X it !</a>

                  <div class="dropdown-divider" v-if="!file.active"></div>
                  <a class="dropdown-item" href="#" v-if="!file.active" @click.prevent="remove(file, index)">Remove</a>
                </div>
              </div>
            </td>

            <td>
              <img class="preview-img-item td-image-thumb" v-if="file.resultThumb" :src="file.resultThumb" @click="open(file.resultThumb)" />
              <span v-else>Waiting for process...</span>
            </td>

          </tr>
        </tbody>
      </table>
    </div>
    <div class="example-foorer">
      <div class="footer-status float-right">
        Drop: {{$refs.upload ? $refs.upload.drop : false}},
        Active: {{$refs.upload ? $refs.upload.active : false}},
        Uploaded: {{$refs.upload ? $refs.upload.uploaded : true}},
        Drop active: {{$refs.upload ? $refs.upload.dropActive : false}}
      </div>
      <div class="btn-group">
        <file-upload
          class="btn btn-primary dropdown-toggle"
          :post-action="postAction"
          :put-action="putAction"
          :extensions="extensions"
          :accept="accept"
          :multiple="multiple"
          :directory="directory"
          :create-directory="createDirectory"
          :size="size || 0"
          :thread="thread < 1 ? 1 : (thread > 5 ? 5 : thread)"
          :headers="headers"
          :data="data"
          :drop="drop"
          :drop-directory="dropDirectory"
          :add-index="addIndex"
          :customAction="inputProgress"
          v-model="files"
          @input-filter="inputFilter"
          @input-file="inputFile"
          ref="upload">
          <i class="fa fa-plus"></i>
          Select
        </file-upload>
        <div class="dropdown-menu">
          <label class="dropdown-item" :for="name">Add files</label>
          <a class="dropdown-item" href="#" @click="onAddFolder">Add folder</a>
          <a class="dropdown-item" href="#" @click.prevent="addData.show = true">Add data</a>
        </div>
      </div>
      <button type="button" class="btn btn-success" v-if="!$refs.upload || !$refs.upload.active" @click.prevent="$refs.upload.active = true">
        <i class="fa fa-arrow-up" aria-hidden="true"></i>
        Waifu2x All
      </button>
      <button type="button" class="btn btn-default"  v-else>
        <i class="fa fa-spinner" aria-hidden="true"></i>
        Waiting...
      </button>
    </div>
  </div>


<div :class="{'modal-backdrop': true, 'fade': true, show: isOption}"></div>
  <div :class="{modal: true, fade: true, show: isOption}" id="modal-edit-file" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Option</h5>
          <button type="button" class="close"  @click.prevent="isOption = false" hidden>
            <span>&times;</span>
          </button>
        </div>
        <form @submit.prevent="isOption = false">
          <div class="modal-body">

            <div class="form-group" hidden>
              <label for="accept">Accept:</label>
              <input type="text" id="accept" class="form-control" v-model="accept">
              <small class="form-text text-muted">Allow upload mime type</small>
            </div>
            <div class="form-group" hidden>
              <label for="extensions">Extensions:</label>
              <input type="text" id="extensions" class="form-control" v-model="extensions">
              <small class="form-text text-muted">Allow upload file extension</small>
            </div>
            <div class="form-group" hidden>
              <label>PUT Upload:</label>
              <div class="form-check">
                <label class="form-check-label">
                  <input class="form-check-input" type="radio" name="put-action" id="put-action" value="" v-model="putAction"> Off
                </label>
              </div>
              <div class="form-check" hidden>
                <label class="form-check-label">
                  <input class="form-check-input" type="radio" name="put-action" id="put-action" value="/upload/put" v-model="putAction"> On
                </label>
              </div>
              <small class="form-text text-muted">After the shutdown, use the POST method to upload</small>
            </div>
            <div class="form-group" hidden>
              <label for="thread">Thread:</label>
              <input type="number" max="5" min="1" id="thread" class="form-control" v-model.number="thread">
              <small class="form-text text-muted">Also upload the number of files at the same time (number of threads)</small>
            </div>
            <div class="form-group" hidden>
              <label for="size">Max size:</label>
              <input type="number" min="0" id="size" class="form-control" v-model.number="size">
            </div>
            <div class="form-group" hidden>
              <label for="minSize">Min size:</label>
              <input type="number" min="0" id="minSize" class="form-control" v-model.number="minSize">
            </div>
            <div class="form-group" hidden>
              <label for="autoCompress">Automatically compress:</label>
              <input type="number" min="0" id="autoCompress" class="form-control" v-model.number="autoCompress">
              <small class="form-text text-muted" v-if="autoCompress > 0">More than {{$formatSize(autoCompress)}} files are automatically compressed</small>
              <small class="form-text text-muted" v-else>Set up automatic compression</small>
            </div>

            <div class="form-group" hidden>
              <div class="form-check">
                <label class="form-check-label">
                  <input type="checkbox" id="add-index" class="form-check-input" v-model="addIndex"> Start position to add
                </label>
              </div>
              <small class="form-text text-muted">Add a file list to start the location to add</small>
            </div>

            <div class="form-group" hidden>
              <div class="form-check">
                <label class="form-check-label">
                  <input type="checkbox" id="drop" class="form-check-input" v-model="drop"> Drop
                </label>
              </div>
              <small class="form-text text-muted">Drag and drop upload</small>
            </div>
            <div class="form-group" hidden>
              <div class="form-check">
                <label class="form-check-label">
                  <input type="checkbox" id="drop-directory" class="form-check-input" v-model="dropDirectory"> Drop directory
                </label>
              </div>
              <small class="form-text text-muted">Not checked, filter the dragged folder</small>
            </div>
            <div class="form-group" hidden>
              <div class="form-check">
                <label class="form-check-label">
                  <input type="checkbox" id="create-directory" class="form-check-input" v-model="createDirectory"> Create Directory
                </label>
              </div>
              <small class="form-text text-muted">The directory file will send an upload request. The mime type is <code>text/directory</code></small>
            </div>

            <div class="form-group">
              <h5>Image type</h5>
              <div class="form-check">
                <label class="form-check-label">
                  <input type="radio" v-model="imageType" value="art"> Artwork
                </label>
                <label class="form-check-label">
                  <input type="radio" v-model="imageType" value="art_y"> Artwork Y
                </label>
                <label class="form-check-label">
                  <input type="radio" v-model="imageType" value="photo"> Photo
                </label>
              </div>
            </div>

            <div class="form-group">
              <h5>Denoising level</h5>
              <div class="form-check">
                <label class="form-check-label" v-for="(_,key) in modelUrls[imageType].noise" v-bind:key="key">
                  <input type="radio" v-model="denoisingLevel" :value="key"> {{ key }}
                </label>
              </div>
            </div>

            <div class="form-group">
              <h5>Scale ratio</h5>
              <div class="form-check">
                <label class="form-check-label" v-for="(_,key) in modelUrls[imageType].scale" v-bind:key="key">
                  <input type="radio" v-model="scaleRatio" :value="key"> {{ key }}
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <h5>Auto start</h5>
              <div class="form-check">
                <label class="form-check-label">
                  &nbsp;&nbsp;&nbsp;
                  <input type="checkbox" id="upload-auto" class="form-check-input" v-model="uploadAuto"> Auto start
                </label>
              </div>
              <small class="form-text text-muted"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Automatically activate waifu2x task</small>
            </div>

          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  </div>


  <div :class="{'modal-backdrop': true, 'fade': true, show: addData.show}"></div>
  <div :class="{modal: true, fade: true, show: addData.show}" id="modal-add-data" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Add data</h5>
          <button type="button" class="close"  @click.prevent="addData.show = false">
            <span>&times;</span>
          </button>
        </div>
        <form @submit.prevent="onAddData">
          <div class="modal-body">
            <div class="form-group">
              <label for="data-name">Name:</label>
              <input type="text" class="form-control" required id="data-name"  placeholder="Please enter a file name" v-model="addData.name">
              <small class="form-text text-muted">Such as <code>filename.png</code></small>
            </div>
            <div class="form-group">
              <label for="data-type">Type:</label>
              <input type="text" class="form-control" required id="data-type"  placeholder="Please enter the MIME type" v-model="addData.type">
              <small class="form-text text-muted">Such as <code>text/plain</code></small>
            </div>
            <div class="form-group">
              <label for="content">Content:</label>
              <textarea class="form-control" required id="content" rows="3" placeholder="Please enter the file contents" v-model="addData.content"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click.prevent="addData.show = false">Close</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>


  <div :class="{'modal-backdrop': true, 'fade': true, show: editFile.show}"></div>
  <div :class="{modal: true, fade: true, show: editFile.show}" id="modal-edit-file" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Edit file</h5>
          <button type="button" class="close"  @click.prevent="editFile.show = false">
            <span>&times;</span>
          </button>
        </div>
        <form @submit.prevent="onEditorFile">
          <div class="modal-body">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" class="form-control" required id="name"  placeholder="Please enter a file name" v-model="editFile.name">
            </div>
            <div class="form-group" v-if="editFile.show && editFile.blob && editFile.type && editFile.type.substr(0, 6) === 'image/'">
              <label>Image: </label>
              <div class="edit-image">
                <img :src="editFile.blob" ref="editImage" />
              </div>

              <div class="edit-image-tool">
                <div class="btn-group" role="group">
                  <button type="button" class="btn btn-primary" @click="editFile.cropper.rotate(-90)" title="cropper.rotate(-90)"><i class="fa fa-undo" aria-hidden="true"></i></button>
                  <button type="button" class="btn btn-primary" @click="editFile.cropper.rotate(90)"  title="cropper.rotate(90)"><i class="fa fa-repeat" aria-hidden="true"></i></button>
                </div>
                <div class="btn-group" role="group">
                  <button type="button" class="btn btn-primary" @click="editFile.cropper.crop()" title="cropper.crop()"><i class="fa fa-check" aria-hidden="true"></i></button>
                  <button type="button" class="btn btn-primary" @click="editFile.cropper.clear()" title="cropper.clear()"><i class="fa fa-remove" aria-hidden="true"></i></button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click.prevent="editFile.show = false">Close</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="pt-5 source-code">
    Source code: <a href="https://github.com/HighCWu/waifu2x-tfjs/blob/example/src/App.vue">/example/src/App.vue</a>
  </div>
  

</div>
</template>

<style>
#header {
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  z-index: 1071;
}
#sidebar {
  background: #fff;
  border-right: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}
@media (min-width: 768px) {
  #sidebar {
    position: -webkit-sticky;
    position: sticky;
    top: 3.5rem;
    z-index: 1000;
    max-height: calc(100vh - 3.5rem);
    border-right: 1px solid #e5e5e5;
    border-bottom: 1px solid #e5e5e5;
  }
}
#sidebar-nav {
  padding-top: 1rem;
  padding-bottom: 1rem;
  margin-right: -15px;
  margin-left: -15px;
  max-height: 100%;
  overflow-y: auto;
}
#sidebar-nav .nav {
  display: block;
}
#sidebar-nav .nav .nav-item .nav {
  display: none;
  margin-bottom: 1rem;
}
#sidebar-nav .nav .nav-item .nav {
  display: none;
  margin-bottom: 1rem;
}
#sidebar-nav .nav .nav-item.active .nav, #sidebar-nav .nav .active + .nav {
  display: block;
}
@media (min-width: 768px) {
  #sidebar-nav .nav .nav-item .nav {
    display: block;
  }
}
#sidebar-nav .nav .nav-link.active, #sidebar-nav .nav .active > .nav-link{
  color: #262626;
  font-weight: 500;
}
#sidebar-nav .nav-item .nav-link {
  padding: .25rem 1rem;
  font-weight: 500;
  color: #666
}
#sidebar-nav .nav-item .nav-item .nav-link {
  font-weight: 400;
  font-size: 85%;
  margin-left: 1rem
}
#main {
  padding-top: 1rem;
  margin-bottom: 2rem
}
blockquote {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}
pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
}
.modal-backdrop.fade {
  visibility: hidden;
}
.modal-backdrop.fade.show {
  visibility: visible;
}
.fade.show {
  display: block;
  z-index: 1072;
}
.source-code {
  font-size: 2em;
  font-weight: bold;
  color: #f00;
}
.example-full .btn-group .dropdown-menu {
  display: block;
  visibility: hidden;
  transition: all .2s
}
.example-full .btn-group:hover > .dropdown-menu {
  visibility: visible;
}
.example-full label.dropdown-item {
  margin-bottom: 0;
}
.example-full .btn-group .dropdown-toggle {
  margin-right: .6rem
}
.td-image-thumb {
  max-width: 4em;
  max-height: 4em;
}
.example-full .filename {
  margin-bottom: .3rem
}
.example-full .btn-is-option {
  margin-top: 0.25rem;
}
.example-full .example-foorer {
  padding: .5rem 0;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
}
.example-full .edit-image img {
  max-width: 100%;
}
.example-full .edit-image-tool {
  margin-top: .6rem;
}
.example-full .edit-image-tool .btn-group{
  margin-right: .6rem;
}
.example-full .footer-status {
  padding-top: .4rem;
}
.example-full .drop-active {
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  position: fixed;
  z-index: 9999;
  opacity: .6;
  text-align: center;
  background: #000;
}
.example-full .drop-active h3 {
  margin: -.5em 0 0;
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  -webkit-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
  font-size: 40px;
  color: #fff;
  padding: 0;
}
</style>

<script>
import { defineComponent } from 'vue'
import Cropper from 'cropperjs'
import ImageCompressor from '@xkeshi/image-compressor'
import FileUpload from 'vue-upload-component'
import { modelUrls } from './assets/models'
import testImg from './assets/test.jpg'
import * as comlink from "comlink"
import Waifu2xWorker from './worker?worker'

const worker = new Waifu2xWorker()

let waifu2xApi;
{(async () => {
  waifu2xApi = await comlink.wrap(worker)
  waifu2xApi.testCallback(comlink.proxy((ratio) => { console.log("test callback with value:", ratio) }))
})()}

export default defineComponent({
  name: 'App',
  components: {
    FileUpload
  },
  data() {
    return {
      imageType: 'art',
      modelUrls,
      denoisingLevel: 'Middle',
      scaleRatio: '2x',
      files: [],
      accept: 'image/png,image/gif,image/jpeg,image/webp',
      extensions: 'gif,jpg,jpeg,png,webp',
      // extensions: ['gif', 'jpg', 'jpeg','png', 'webp'],
      // extensions: /\.(gif|jpe?g|png|webp)$/i,
      minSize: 1024,
      size: 1024 * 1024 * 10,
      multiple: true,
      directory: false,
      drop: true,
      dropDirectory: true,
      createDirectory: false,
      addIndex: false,
      thread: 1,
      name: 'file',
      postAction: '/upload/post',
      putAction: '/upload/put',
      headers: {
        'X-Csrf-Token': 'xxxx',
      },
      data: {
        '_csrf_token': 'xxxxxx',
      },
      autoCompress: 0,
      uploadAuto: true,
      isOption: true,
      addData: {
        show: false,
        name: '',
        type: '',
        content: '',
      },
      editFile: {
        show: false,
        name: '',
      }
    }
  },
  created() {
    this.$nextTick( () => {
      if (window.localStorage.getItem("imageStyle")) this.imageType = window.localStorage.getItem("imageStyle")
      if (window.localStorage.getItem("denoisingLevel")) this.denoisingLevel = window.localStorage.getItem("denoisingLevel")
      if (window.localStorage.getItem("scaleRatio")) this.scaleRatio = window.localStorage.getItem("scaleRatio")
      if (window.localStorage.getItem("uploadAuto")) this.uploadAuto = window.localStorage.getItem("uploadAuto")
    })
  },
  watch: {
    'editFile.show'(newValue, oldValue) {
      // 关闭了 自动删除 error
      if (!newValue && oldValue) {
        this.$refs.upload.update(this.editFile.id, { error: this.editFile.error || '' })
      }
      if (newValue) {
        this.$nextTick( () => {
          if (!this.$refs.editImage) {
            return
          }
          let cropper = new Cropper(this.$refs.editImage, {
            autoCrop: false,
          })
          this.editFile = {
            ...this.editFile,
            cropper
          }
        })
      }
    },
    'addData.show'(show) {
      if (show) {
        this.addData.name = ''
        this.addData.type = ''
        this.addData.content = ''
      }
    },
    isOption(newValue, oldValue)
    {
      if (!newValue)
      {
        window.localStorage.setItem("imageStyle", this.imageType)
        window.localStorage.setItem("denoisingLevel", this.denoisingLevel)
        window.localStorage.setItem("scaleRatio", this.scaleRatio)
        window.localStorage.setItem("uploadAuto", this.uploadAuto)

        this.files = [];
        if (window.localStorage.getItem("removeTestImage") !== "1") {
          {(async () => {
            const testBlob = await((await fetch(testImg)).blob())
            testBlob.name = testImg.split('/')[testImg.split('/').length - 1]
            this.$refs.upload.add(testBlob)
          })()}
        }
      }
    },
    imageType(newValue, oldValue)
    {
      if (newValue === 'art_y' && this.denoisingLevel === 'Highest')
        this.denoisingLevel = 'High'
    }
  },
  methods: {
    remove(file, index) {
      this.$refs.upload.remove(file)
      if (index === 0) window.localStorage.setItem("removeTestImage", "1")
    },
    open(url) {
      window.open(url)
    },
    inputProgress(file, uploader) {
      if (file.blob)
      {
        const curModelUrls = [
          this.modelUrls[this.imageType].noise[this.denoisingLevel],
          this.modelUrls[this.imageType].scale[this.scaleRatio]
        ]
        
        return new Promise((resolve, reject) => {
          let img = new Image();
          img.onload = () => {
            const callbackDownloadProgress1 = ratio => {
              file = uploader.update(file, {
                progress: (1/8*ratio*100).toFixed(2)
              })
            }
            const callbackDownloadProgress2 = ratio => {
              file = uploader.update(file, {
                progress: ((1/8*ratio+1/8)*100).toFixed(2)
              })
            }
            const callbackPredictProgress1 = ratio => {
              file = uploader.update(file, {
                progress: (3/8*ratio*100+1/4).toFixed(2)
              })
            }
            const callbackPredictProgress2 = ratio => {
              file = uploader.update(file, {
                progress: ((3/8*ratio+1/4+3/8)*100).toFixed(2)
              })
            }
            const asyncFn = async () => {
              let imageBitmap = await createImageBitmap(img, 0, 0, 10000, 10000)
              await waifu2xApi.init(curModelUrls[0])
              waifu2xApi.listenToModelDownloadProgress(curModelUrls[0], comlink.proxy(callbackDownloadProgress1))
              await waifu2xApi.init(curModelUrls[1])
              
              waifu2xApi.listenToModelPredictProgress(curModelUrls[0], comlink.proxy(callbackPredictProgress1))

              imageBitmap = await waifu2xApi.predict(curModelUrls[0], comlink.transfer(imageBitmap, [imageBitmap]))

              waifu2xApi.listenToModelDownloadProgress(curModelUrls[1], comlink.proxy(callbackDownloadProgress2))
              waifu2xApi.listenToModelPredictProgress(curModelUrls[1], comlink.proxy(callbackPredictProgress2))
              imageBitmap = await waifu2xApi.predict(curModelUrls[1], comlink.transfer(imageBitmap, [imageBitmap]))

              // create a canvas
              const canvas = document.createElement('canvas');
              // resize it to the size of our ImageBitmap
              canvas.width = imageBitmap.width;
              canvas.height = imageBitmap.height;
              // try to get a bitmaprenderer context
              let ctx = canvas.getContext('bitmaprenderer');
              if(ctx) {
                // transfer the ImageBitmap to it
                ctx.transferFromImageBitmap(imageBitmap);
              }
              else {
                // in case someone supports createImageBitmap only
                // twice in memory...
                canvas.getContext('2d').drawImage(imageBitmap,0,0)
              }
              // get it back as a Blob
              canvas.toBlob(blob => {
                const resultThumb = URL.createObjectURL(blob)
                file = uploader.update(file, {
                  progress: '100.00',
                  success: true,
                  resultThumb
                })
                resolve(file)
              })
            }
            asyncFn()
          } 
          img.οnerrοr = (e) => {
            uploader.update(file, { error: 'read image blob'}) 
            reject(e)
          }
          img.src = file.blob
        })
      }
      else {
        file = uploader.update(file, {
          progress: '100.00',
          success: false,
          error: 'read image blob',
          activate: false
        })
        return new Promise(resolve => {
          resolve(file)
        })
      }
    },
    inputFilter(newFile, oldFile, prevent) {
      if (newFile && !oldFile) {
        // Before adding a file
        // 添加文件前
        // Filter system files or hide files
        // 过滤系统文件 和隐藏文件
        if (/(\/|^)(Thumbs\.db|desktop\.ini|\..+)$/.test(newFile.name)) {
          return prevent()
        }
        // Filter php html js file
        // 过滤 php html js 文件
        if (/\.(php5?|html?|jsx?)$/i.test(newFile.name)) {
          return prevent()
        }
        // Automatic compression
        // 自动压缩
        if (newFile.file && newFile.error === "" && newFile.type.substr(0, 6) === 'image/' && this.autoCompress > 0 && this.autoCompress < newFile.size) {
          newFile.error = 'compressing'
          const imageCompressor = new ImageCompressor(null, {
            convertSize: 1024 * 1024,
            maxWidth: 512,
            maxHeight: 512,
          })
          imageCompressor.compress(newFile.file)
            .then((file) => {
              this.$refs.upload.update(newFile, { error: '', file, size: file.size, type: file.type })
            })
            .catch((err) => {
              this.$refs.upload.update(newFile, { error: err.message || 'compress' })
            })
        }
      }
      if (newFile && newFile.error === "" && newFile.file && (!oldFile || newFile.file !== oldFile.file)) {
        // Create a blob field
        // 创建 blob 字段
        newFile.blob = ''
        let URL = (window.URL || window.webkitURL)
        if (URL) {
          newFile.blob = URL.createObjectURL(newFile.file)
        }
        // Thumbnails
        // 缩略图
        newFile.thumb = ''
        if (newFile.blob && newFile.type.substr(0, 6) === 'image/') {
          newFile.thumb = newFile.blob
        }
      }
      // image size
      // image 尺寸
      if (newFile && newFile.error === '' && newFile.type.substr(0, 6) === "image/" && newFile.blob && (!oldFile || newFile.blob !== oldFile.blob)) {
        newFile.error = 'image parsing'
        let img = new Image();
        img.onload = () => {
          this.$refs.upload.update(newFile, {error: '', height: img.height, width: img.width})
        } 
        img.οnerrοr = (e) => {
          this.$refs.upload.update(newFile, { error: 'parsing image size'}) 
        }
        img.src = newFile.blob
      }
    },
    // add, update, remove File Event
    inputFile(newFile, oldFile) {
      if (newFile && oldFile) {
        // update
        if (newFile.active && !oldFile.active) {
          // beforeSend
          // min size
          if (newFile.size >= 0 && this.minSize > 0 && newFile.size < this.minSize) {
            this.$refs.upload.update(newFile, { error: 'size' })
          }
        }
        if (newFile.progress !== oldFile.progress) {
          // progress
        }
        if (newFile.error && !oldFile.error) {
          // error
        }
        if (newFile.success && !oldFile.success) {
          // success
        }
      }
      if (!newFile && oldFile) {
        // remove
        if (oldFile.success && oldFile.response.id) {
          // $.ajax({
          //   type: 'DELETE',
          //   url: '/upload/delete?id=' + oldFile.response.id,
          // })
        }
      }
      // Automatically activate upload
      if (Boolean(newFile) !== Boolean(oldFile) || oldFile.error !== newFile.error) {
        if (this.uploadAuto && !this.$refs.upload.active) {
          this.$refs.upload.active = true
        }
      }
    },
    alert(message) {
      alert(message)
    },
    onEditFileShow(file) {
      this.editFile = { ...file, show: true }
      this.$refs.upload.update(file, { error: 'edit' })
    },
    onEditorFile() {
      if (!this.$refs.upload.features.html5) {
        this.alert('Your browser does not support')
        this.editFile.show = false
        return
      }
      let data = {
        name: this.editFile.name,
        error: '',
      }
      if (this.editFile.cropper) {
        let binStr = atob(this.editFile.cropper.getCroppedCanvas().toDataURL(this.editFile.type).split(',')[1])
        let arr = new Uint8Array(binStr.length)
        for (let i = 0; i < binStr.length; i++) {
          arr[i] = binStr.charCodeAt(i)
        }
        data.file = new File([arr], data.name, { type: this.editFile.type })
        data.size = data.file.size
      }
      this.$refs.upload.update(this.editFile.id, data)
      this.editFile.error = ''
      this.editFile.show = false
    },
    // add folder
    onAddFolder() {
      if (!this.$refs.upload.features.directory) {
        this.alert('Your browser does not support')
        return
      }
      let input = document.createElement('input')
      input.style = "background: rgba(255, 255, 255, 0);overflow: hidden;position: fixed;width: 1px;height: 1px;z-index: -1;opacity: 0;"
      input.type = 'file'
      input.setAttribute('allowdirs', true)
      input.setAttribute('directory', true)
      input.setAttribute('webkitdirectory', true)
      input.multiple = true
      document.querySelector("body").appendChild(input)
      input.click()
      input.onchange = (e) => {
        this.$refs.upload.addInputFile(input).then(function() {
          document.querySelector("body").removeChild(input)
        })
      }
    },
    onAddData() {
      this.addData.show = false
      if (!this.$refs.upload.features.html5) {
        this.alert('Your browser does not support')
        return
      }
      let file = new window.File([this.addData.content], this.addData.name, {
        type: this.addData.type,
      })
      this.$refs.upload.add(file)
    }
  }
})
</script>
