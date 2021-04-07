'use strict';

var uuid = require('@braintree/uuid');
var findRootNode = require('./find-root-node');

// based on https://github.com/krakenjs/belter/blob/cdddc4f8ddb172d29db9e7e1ad1eeeacfb93e215/src/dom.js#L981-L1031
// thanks @bluepnume

function isShadowElement(element) {
  element = findRootNode(element);

  return element.toString() === '[object ShadowRoot]';
}

function getShadowHost(element) {
  element = findRootNode(element);

  if (!isShadowElement(element)) {
    return null;
  }

  return element.host;
}

function transformToSlot(element, styles) {
  var styleNode = findRootNode(element).querySelector('style');
  var shadowHost = getShadowHost(element);
  var slotName = 'shadow-slot-' + uuid();
  var slot = document.createElement('slot');
  var slotProvider = document.createElement('div');

  slot.setAttribute('name', slotName);
  element.appendChild(slot);

  slotProvider.setAttribute('slot', slotName);
  shadowHost.appendChild(slotProvider);

  if (styles) {
    if (!styleNode) {
      styleNode = document.createElement('style');
      element.appendChild(styleNode);
    }

    styleNode.sheet.insertRule('::slotted([slot="' + slotName + '"]) { ' + styles + ' }');
  }

  if (isShadowElement(shadowHost)) {
    return transformToSlot(slotProvider, styles);
  }

  return slotProvider;
}

module.exports = {
  isShadowElement: isShadowElement,
  getShadowHost: getShadowHost,
  transformToSlot: transformToSlot
};
