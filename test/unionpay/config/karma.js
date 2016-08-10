'use strict';

var defaults = require('../../karma-config-defaults');

module.exports = function (config) {
  config.set(Object.assign({}, defaults, {
    basePath: '../'
  }));
};
