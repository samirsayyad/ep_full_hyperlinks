/* eslint-disable import/no-named-as-default */
/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable n/no-unsupported-features/es-syntax */
/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable node/no-unpublished-import */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import {terser} from 'rollup-plugin-terser';

export default {
  input: './static/js/index.js',
  output: {
    file: './static/dist/bundle.js',
    format: 'cjs',
    sourcemap: true,
    strict: true,
    compact: true,
    minifyInternalExports: true,
  },
  watch: {
    include: './static/js/**',
    clearScreen: false,
  },
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    babel({
      include: ['**.js', 'node_modules/**'],
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env'],
    }),
    terser(),
  ],
};
