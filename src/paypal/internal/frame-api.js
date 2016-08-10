'use strict';

var client = require('../../client');
var jsonClone = require('../../lib/json-clone');

function request(options, callback) {
  var requestOptions = jsonClone(options);

  requestOptions.data = requestOptions.data || {};
  requestOptions.data._meta = requestOptions.data._meta || {};
  requestOptions.data._meta.source = 'paypal';

  client.create(requestOptions.clientOptions, function (err, clientInstance) {
    if (err) {
      callback(err);
      return;
    }

    clientInstance.request(requestOptions, callback);
  });
}

module.exports = {
  request: request
};
