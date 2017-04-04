'use strict';

var composeOptions = require('./compose-options');

function noop() {}

function Popup(options) {
  this.closed = null;
  this._frame = null;
  this._options = options || {};

  this.open();
}

Popup.prototype.initialize = noop;

Popup.prototype.open = function () {
  this._frame = global.open(
    this._options.openFrameUrl,
    this._options.name,
    composeOptions(this._options)
  );
  this.closed = false;
};

Popup.prototype.focus = function () {
  this._frame.focus();
};

Popup.prototype.close = function () {
  if (this.closed) {
    return;
  }

  this.closed = true;
  this._frame.close();
};

Popup.prototype.redirect = function (redirectUrl) {
  this._frame.location.href = redirectUrl;
};

module.exports = Popup;
