"use strict";

var COMPONENTS = require("../../components.json");
var files = COMPONENTS.reduce(function (components, name) {
  components.push(name);
  components.push(name + ".min");

  return components;
}, []);

module.exports = {
  components: COMPONENTS,
  files: files,
};
