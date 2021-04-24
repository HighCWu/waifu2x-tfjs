import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';


const pkg = require('./package.json');

export default {
  input: 'src/index.ts',
  output: {
    file: `build/umd/${pkg.name}.js`,
    format: 'umd',
    sourcemap: true,
    name: pkg.name
  },
  plugins: [
    nodeResolve({ browser:true, preferBuiltins: true }), 
    typescript({
      tsconfig: 'tsconfig.module.json'
    }),
    commonjs(),
    builtins()
  ]
};