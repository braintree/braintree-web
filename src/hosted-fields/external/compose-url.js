'use strict';

var constants = require('../shared/constants');

module.exports = function composeUrl(assetsUrl, componentId) {
  return assetsUrl +
    '/web/' +
    constants.VERSION +
    '/html/hosted-fields-frame@DOT_MIN.html#' +
    componentId;
};
