'use strict';

var SongbirdFramework = require('./songbird');

function CardinalModalFramework(options) {
  SongbirdFramework.call(this, options);
}

CardinalModalFramework.prototype = Object.create(SongbirdFramework.prototype, {
  constructor: SongbirdFramework
});

CardinalModalFramework.prototype._createV1IframeModalElement = function (iframe) {
  var modal = document.createElement('div');
  var addCloseButton = Boolean(this._createOptions &&
    this._createOptions.cardinalSDKConfig &&
    this._createOptions.cardinalSDKConfig.payment &&
    this._createOptions.cardinalSDKConfig.payment.displayExitButton);

  modal.innerHTML = '<div style="' +
    'position: fixed;' +
    'z-index: 999999;' +
    'top: 50%;' +
    'left: 50%;' +
    'padding: 24px 20px;' +
    'transform: translate(-50%,-50%);' +
    'border-radius: 2px;' +
    'background: #fff;' +
    'max-width: 100%;' +
    'overflow: auto;' +
  '">' +
    '<div>' +
      '<button data-braintree-v1-fallback-close-button ' +
        'style="' +
          'font-family: Helvetica,Arial,sans-serif;' +
          'font-size: 25px;' +
          'line-height: 12px;' +
          'position: absolute;' +
          'top: 2px;' +
          'right: 0px;' +
          'cursor: pointer;' +
          'color: #999;' +
          'border: 0;' +
          'outline: none;' +
          'background: none;' +
        '" ' +
        'onMouseOver="this.style.color=\'#000\'" ' +
        'onMouseOut="this.style.color=\'#999\'"' +
      '>×</button>' +
    '</div>' +
    // iframe container
    '<div data-braintree-v1-fallback-iframe-container style="' +
      'height: 400px;' +
    '"></div>' +
  '</div>' +
  // modal backdrop
  '<div data-braintree-v1-fallback-backdrop style="' +
    'position: fixed;' +
    'z-index: 999998;' +
    'cursor: pointer;' +
    'top: 0;' +
    'left: 0;' +
    'width: 100%;' +
    'height: 100%;' +
    'transition: opacity 1ms ease;' +
    'background: rgba(0,0,0,.6);' +
  '"></div>';

  if (!addCloseButton) {
    modal.querySelector('[data-braintree-v1-fallback-close-button]').style.display = 'none';
  }
  modal.querySelector('[data-braintree-v1-fallback-iframe-container]').appendChild(iframe);

  return modal;
};

module.exports = CardinalModalFramework;
