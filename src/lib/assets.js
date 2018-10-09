'use strict';

// TODO this logic is duplicated in braintree-web-drop-in
// Pull this out into a separate module

var Promise = require('./promise');

function loadScript(options) {
  var script = document.createElement('script');
  var attrs = options.dataAttributes || {};
  var container = options.container || document.head;

  script.src = options.src;
  script.id = options.id;
  script.async = true;

  Object.keys(attrs).forEach(function (key) {
    script.setAttribute('data-' + key, attrs[key]);
  });

  return new Promise(function (resolve, reject) {
    script.addEventListener('load', resolve);
    script.addEventListener('error', function () {
      reject(new Error(options.src + ' failed to load.'));
    });
    script.addEventListener('abort', function () {
      reject(new Error(options.src + ' has aborted.'));
    });
    container.appendChild(script);
  });
}

module.exports = {
  loadScript: loadScript
};
