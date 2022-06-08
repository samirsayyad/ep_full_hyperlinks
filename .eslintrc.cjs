'use strict';

// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('eslint-config-etherpad/patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: 'etherpad/plugin',
};

rules: {
  'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],
}