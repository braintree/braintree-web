"use strict";

var Popup = require("./strategies/popup");
var PopupBridge = require("./strategies/popup-bridge");
var Modal = require("./strategies/modal");
var Bus = require("framebus");
var events = require("../shared/events");
var errors = require("../shared/errors");
var constants = require("../shared/constants");
var uuid = require("@braintree/uuid");
var iFramer = require("@braintree/iframer");
var BraintreeError = require("../../braintree-error");
var browserDetection = require("../shared/browser-detection");
var assign = require("./../../assign").assign;
var BUS_CONFIGURATION_REQUEST_EVENT =
  require("../../constants").BUS_CONFIGURATION_REQUEST_EVENT;

var REQUIRED_CONFIG_KEYS = ["name", "dispatchFrameUrl", "openFrameUrl"];

function noop() {}

function _validateFrameConfiguration(options) {
  if (!options) {
    throw new Error("Valid configuration is required");
  }

  REQUIRED_CONFIG_KEYS.forEach(function (key) {
    if (!options.hasOwnProperty(key)) {
      throw new Error("A valid frame " + key + " must be provided");
    }
  });

  if (!/^[\w_]+$/.test(options.name)) {
    throw new Error("A valid frame name must be provided");
  }
}

function FrameService(options) {
  _validateFrameConfiguration(options);

  this._serviceId = uuid().replace(/-/g, "");

  this._options = {
    name: options.name + "_" + this._serviceId,
    dispatchFrameUrl: options.dispatchFrameUrl,
    openFrameUrl: options.openFrameUrl,
    height: options.height,
    width: options.width,
    top: options.top,
    left: options.left,
  };
  this.state = options.state || {};

  this._bus = new Bus({ channel: this._serviceId });
  this._setBusEvents();
}

FrameService.prototype.initialize = function (callback) {
  var dispatchFrameReadyHandler = function () {
    callback();
    this._bus.off(events.DISPATCH_FRAME_READY, dispatchFrameReadyHandler);
  }.bind(this);

  this._bus.on(events.DISPATCH_FRAME_READY, dispatchFrameReadyHandler);
  this._writeDispatchFrame();
};

FrameService.prototype._writeDispatchFrame = function () {
  var frameName = constants.DISPATCH_FRAME_NAME + "_" + this._serviceId;
  var frameSrc = this._options.dispatchFrameUrl;

  this._dispatchFrame = iFramer({
    "aria-hidden": true,
    name: frameName,
    title: frameName,
    src: frameSrc,
    class: constants.DISPATCH_FRAME_CLASS,
    height: 0,
    width: 0,
    style: {
      position: "absolute",
      left: "-9999px",
    },
  });

  document.body.appendChild(this._dispatchFrame);
};

FrameService.prototype._setBusEvents = function () {
  this._bus.on(
    events.DISPATCH_FRAME_REPORT,
    function (res, reply) {
      if (this._onCompleteCallback) {
        this._onCompleteCallback.call(null, res.err, res.payload);
      }
      this._frame.close();

      this._onCompleteCallback = null;

      if (reply) {
        reply();
      }
    }.bind(this)
  );

  this._bus.on(
    BUS_CONFIGURATION_REQUEST_EVENT,
    function (reply) {
      reply(this.state);
    }.bind(this)
  );
};

FrameService.prototype.open = function (options, callback) {
  options = options || {};
  this._frame = this._getFrameForEnvironment(options);

  this._frame.initialize(callback);

  if (this._frame instanceof PopupBridge) {
    // Frameservice loads a spinner then redirects to the final destination url.
    // For Popupbridge it doesn't have the same rules around popups since it's deferred to the mobile side
    // therefore, skips the regular open path and instead uses `#redirect` to handle things
    return;
  }

  assign(this.state, options.state);

  this._onCompleteCallback = callback;
  this._frame.open();

  if (this.isFrameClosed()) {
    this._cleanupFrame();

    if (callback) {
      callback(new BraintreeError(errors.FRAME_SERVICE_FRAME_OPEN_FAILED));
    }

    return;
  }
  this._pollForPopupClose();
};

FrameService.prototype.redirect = function (url) {
  if (this._frame && !this.isFrameClosed()) {
    this._frame.redirect(url);
  }
};

FrameService.prototype.close = function () {
  if (!this.isFrameClosed()) {
    this._frame.close();
  }
};

FrameService.prototype.focus = function () {
  if (!this.isFrameClosed()) {
    this._frame.focus();
  }
};

FrameService.prototype.createHandler = function (options) {
  options = options || {};

  return {
    close: function () {
      if (options.beforeClose) {
        options.beforeClose();
      }

      this.close();
    }.bind(this),
    focus: function () {
      if (options.beforeFocus) {
        options.beforeFocus();
      }

      this.focus();
    }.bind(this),
  };
};

FrameService.prototype.createNoopHandler = function () {
  return {
    close: noop,
    focus: noop,
  };
};

FrameService.prototype.teardown = function () {
  this.close();
  this._dispatchFrame.parentNode.removeChild(this._dispatchFrame);
  this._dispatchFrame = null;
  this._cleanupFrame();
};

FrameService.prototype.isFrameClosed = function () {
  return this._frame == null || this._frame.isClosed();
};

FrameService.prototype._cleanupFrame = function () {
  this._frame = null;
  clearInterval(this._popupInterval);
  this._popupInterval = null;
};

FrameService.prototype._pollForPopupClose = function () {
  this._popupInterval = setInterval(
    function () {
      if (this.isFrameClosed()) {
        this._cleanupFrame();
        if (this._onCompleteCallback) {
          this._onCompleteCallback(
            new BraintreeError(errors.FRAME_SERVICE_FRAME_CLOSED)
          );
        }
      }
    }.bind(this),
    constants.POPUP_POLL_INTERVAL
  );

  return this._popupInterval;
};

FrameService.prototype._getFrameForEnvironment = function (options) {
  var usePopup = browserDetection.supportsPopups();
  var popupBridgeExists = Boolean(window.popupBridge);

  var initOptions = assign({}, this._options, options);

  if (popupBridgeExists) {
    return new PopupBridge(initOptions);
  } else if (usePopup) {
    return new Popup(initOptions);
  }

  return new Modal(initOptions);
};

module.exports = FrameService;
