import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const resolveExternalsPlugin = require('vite-plugin-resolve-externals')

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    resolveExternalsPlugin({
      'marked': 'marked',
      'highlight.js': 'hljs',
      'cropperjs': 'Cropper',
      '@xkeshi/image-compressor': 'ImageCompressor',
    }),
  ],
  resolve: {}
})
