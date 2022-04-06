"use strict";

var constants = require("../shared/constants");
var useMin = require("../../lib/use-min");

module.exports = function composeUrl(assetsUrl, componentId, isDebug) {
  return (
    assetsUrl +
    "/web/" +
    constants.VERSION +
    "/html/hosted-fields-frame" +
    useMin(isDebug) +
    ".html#" +
    componentId
  );
};
