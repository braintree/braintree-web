'use strict';

var Bus = require('../../lib/bus');
var isWhitelistedDomain = require('../../lib/is-whitelisted-domain');
var BraintreeError = require('../../lib/error');

module.exports = function () {
  var bus = new Bus({
    channel: window.name.split('_')[1]
  });

  bus.emit(Bus.events.CONFIGURATION_REQUEST, handleConfiguration);
};

function handleConfiguration(configuration) {
  var input, field;
  var fields = {pareq: 'PaReq', md: 'MD', termUrl: 'TermUrl'};
  var form = document.createElement('form');

  if (!isWhitelistedDomain(configuration.termUrl)) {
    throw new BraintreeError({
      type: BraintreeError.types.INTERNAL,
      message: 'Term Url must be on a Braintree domain.'
    });
  }

  form.action = configuration.acsUrl;
  form.method = 'POST';

  for (field in fields) {
    if (fields.hasOwnProperty(field)) {
      input = document.createElement('input');
      input.name = fields[field];
      input.type = 'hidden';
      input.setAttribute('value', configuration[field]);
      form.appendChild(input);
    }
  }

  document.body.appendChild(form);

  form.submit();
}
