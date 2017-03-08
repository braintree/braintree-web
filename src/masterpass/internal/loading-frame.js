'use strict';

function noop() {}

function start() {
  var script = document.createElement('script');
  var envSubdomain = getParameterByName('environment') === 'production' ? '' : 'sandbox.';

  script.type = 'text/javascript';
  script.src = 'https://' + envSubdomain + 'static.masterpass.com/dyn/js/switch/integration/MasterPass.client.js';

  script.onload = function () {
    window.MasterPass.client.checkout({
      requestToken: getParameterByName('requestToken'),
      callbackUrl: getParameterByName('callbackUrl'),
      failureCallback: noop,
      cancelCallback: noop,
      successCallback: noop,
      merchantCheckoutId: getParameterByName('merchantCheckoutId'),
      allowedCardTypes: getParameterByName('allowedCardTypes'),
      version: 'v6'
    });
  };

  document.body.appendChild(script);
}

function getParameterByName(name) {
  var url = window.location.href;
  var regex = new RegExp('[?&]' + name.replace(/[\[\]]/g, '\\$&') + '(=([^&#]*)|&|#|$)');
  var results = regex.exec(url);

  if (!results) { return null; }
  if (!results[2]) { return ''; }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

module.exports = {
  start: start
};
