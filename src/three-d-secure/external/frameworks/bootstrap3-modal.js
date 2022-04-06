"use strict";
// NEXT_MAJOR_VERSION drop support for Bootstrap framework,
// recomend using inline frame version and putting it in
// the merchant's own bootstrap modal

var SongbirdFramework = require("./songbird");

function Bootstrap3ModalFramework(options) {
  SongbirdFramework.call(this, options);
}

Bootstrap3ModalFramework.prototype = Object.create(
  SongbirdFramework.prototype,
  {
    constructor: SongbirdFramework,
  }
);

Bootstrap3ModalFramework.prototype._createV1IframeModalElement = function (
  iframe
) {
  var modal = document.createElement("div");

  modal.innerHTML =
    '<div class="modal fade in" tabindex="-1" role="dialog" aria-labelledby="CCAFrameModal-label" aria-hidden="true" style="display: block;">' +
    '<div class="modal-dialog" style="width:440px;z-index:999999;">' +
    '<div class="modal-content">' +
    '<div class="modal-body" data-braintree-v1-fallback-iframe-container>' +
    '<button type="button" data-braintree-v1-fallback-close-button class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div data-braintree-v1-fallback-backdrop style="' +
    "position: fixed;" +
    "cursor: pointer;" +
    "z-index: 999998;" +
    "top: 0;" +
    "left: 0;" +
    "width: 100%;" +
    "height: 100%;" +
    '"></div>' +
    "</div>";

  modal
    .querySelector("[data-braintree-v1-fallback-iframe-container]")
    .appendChild(iframe);

  return modal;
};

Bootstrap3ModalFramework.prototype._createCardinalConfigurationOptions =
  function (setupOptions) {
    var options =
      SongbirdFramework.prototype._createCardinalConfigurationOptions.call(
        this,
        setupOptions
      );

    options.payment.framework = "bootstrap3";

    return options;
  };

module.exports = Bootstrap3ModalFramework;
