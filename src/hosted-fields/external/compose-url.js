'use strict';

var constants = require('../shared/constants');

module.exports = function composeUrl(assetsUrl, componentId, isDebug) {
  return assetsUrl +
    '/web/' +
    constants.VERSION +
    '/html/hosted-fields-frame' + (isDebug ? '' : '.min') + '.html#' +
    componentId;
};
