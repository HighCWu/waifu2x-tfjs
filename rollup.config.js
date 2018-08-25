import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import babel from 'rollup-plugin-babel';

const base = {
  input: 'src/index.js',
  plugins: [resolve(), commonjs()]
};

export default [
  {
    ...base,
    output: [
      {
        file: 'es6/index.js',
        format: 'esm'
      },
      {
        file: 'lib/index.js',
        format: 'cjs'
      }
    ],
    plugins: [
      autoExternal(),
      ...base.plugins,
      babel({
        presets: [
          [
            '@babel/preset-env',
            {
              modules: false,
              targets: { node: '8' }
            }
          ]
        ],
        plugins: ['@babel/plugin-transform-runtime'],
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      })
    ]
  },
  {
    ...base,
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'Waifu2x'
    },
    plugins: [
      ...base.plugins,
      babel({
        presets: [
          [
            '@babel/preset-env',
            {
              modules: false,
              targets: '>1%, not dead'
            }
          ]
        ],
        plugins: [
          '@babel/plugin-transform-runtime',
          '@babel/plugin-transform-regenerator'
        ],
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      })
    ]
  }
];
