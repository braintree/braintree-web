'use strict';

var LegacyFramework = require('./legacy');
var CardinalModalFramework = require('./cardinal-modal');
var Bootstrap3ModalFramework = require('./bootstrap3-modal');
var InlineIframeFramework = require('./inline-iframe');

module.exports = {
  legacy: LegacyFramework,
  'cardinal-modal': CardinalModalFramework,
  'bootstrap3-modal': Bootstrap3ModalFramework,
  'inline-iframe': InlineIframeFramework
};
