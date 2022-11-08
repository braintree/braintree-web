"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var setup_iframe_base_1 = __importDefault(require("./setup-iframe-base"));
var modal_1 = __importDefault(require("./ui-elements/modal"));
var framebus_1 = __importDefault(require("framebus"));
var events_1 = require("../shared/events");
module.exports = function start() {
  var hash = window.location.hash.split("#")[1];
  var _a = hash.split("_"),
    env = _a[0],
    id = _a[1];
  var bus = new framebus_1.default({
    channel: id,
    targetFrames: [window.parent],
  });
  setup_iframe_base_1.default();
  var modal = modal_1.default.create({
    container: document.body,
    onRequestNewQrCode: function () {
      bus.emit(events_1.VENMO_DESKTOP_REQUEST_NEW_QR_CODE);
    },
    onClose: function () {
      bus.emit(events_1.VENMO_DESKTOP_CUSTOMER_CANCELED);
      modal.reset();
    },
  });
  bus.on(events_1.VENMO_DESKTOP_DISPLAY_ERROR, function (payload) {
    modal.displayError(payload.message);
  });
  bus.on(events_1.VENMO_DESKTOP_DISPLAY_QR_CODE, function (payload) {
    var url =
      "https://venmo.com/go/purchase?facilitator=BT&intent=Continue&resource_id=" +
      payload.id +
      "&merchant_id=" +
      payload.merchantId +
      "&environment=" +
      env;
    modal.show();
    modal.displayQRCode(url);
  });
  bus.on(events_1.VENMO_DESKTOP_AUTHORIZING, function () {
    modal.authorizing();
  });
  bus.on(events_1.VENMO_DESKTOP_AUTHORIZE, function () {
    modal.authorize();
  });
  bus.on(events_1.VENMO_DESKTOP_CLOSED_FROM_PARENT, function () {
    modal.reset();
  });
  bus.emit(events_1.VENMO_DESKTOP_IFRAME_READY);
};
