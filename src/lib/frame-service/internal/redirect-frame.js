"use strict";

var frameService = require("./");
var querystring = require("../../querystring");

function start() {
  // In rare cases (i.e. in IE11 Metro), the parent frame cannot close the popup frame until it has
  // focus. This timer will close the popup frame if the parent hasn't replied to the event to
  // indicate that it can close the popup.
  var closeTimer = setTimeout(function () {
    window.close();
  }, 1000);
  var params = querystring.parse();

  frameService.report(null, params, function () {
    clearTimeout(closeTimer);
  });
}

module.exports = {
  start: start,
};
