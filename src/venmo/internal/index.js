// @ts-nocheck
import setupIframeBase from "./setup-iframe-base";
import Modal from "./ui-elements/modal";
import framebus from "framebus";
import events from "../shared/events";

export default function start() {
  var hash = window.location.hash.split("#")[1];
  var _a = hash.split("_"),
    env = _a[0],
    id = _a[1];
  var bus = new framebus({
    channel: id,
    targetFrames: [window.parent],
  });
  setupIframeBase();
  var sendEvent = function (eventName, metadata) {
    bus.emit(events.VENMO_DESKTOP_ANALYTICS_EVENT, {
      eventName: eventName,
      metadata: metadata || {},
    });
  };
  var modal = Modal.create({
    container: document.body,
    sendEvent: sendEvent,
    onRequestNewQrCode: function (source) {
      bus.emit(events.VENMO_DESKTOP_REQUEST_NEW_QR_CODE, { source: source });
    },
    onClose: function () {
      bus.emit(events.VENMO_DESKTOP_CUSTOMER_CANCELED);
      modal.reset();
    },
  });
  bus.on(events.VENMO_DESKTOP_DISPLAY_ERROR, function (payload) {
    modal.displayError(payload.message);
  });
  bus.on(events.VENMO_DESKTOP_DISPLAY_QR_CODE, function (payload) {
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
  bus.on(events.VENMO_DESKTOP_AUTHORIZING, function () {
    modal.authorizing();
  });
  bus.on(events.VENMO_DESKTOP_AUTHORIZE, function () {
    modal.authorize();
  });
  bus.on(events.VENMO_DESKTOP_CLOSED_FROM_PARENT, function () {
    modal.reset();
  });
  bus.emit(events.VENMO_DESKTOP_IFRAME_READY);
}
