'use strict';

var frameService = require('../../lib/frame-service/internal');
var querystring = require('../../lib/querystring');

function start() {
  var params = querystring.parse();

  frameService.report(null, params);
  // IE 11 metro mode needs this to close popup
  frameService.asyncClose();
}

module.exports = {
  start: start
};
