'use strict';

var initializeAuthenticationCompleteFrame = require('../../../../src/three-d-secure/internal/authentication-complete-frame');
var Bus = require('../../../../src/lib/bus');
var events = require('../../../../src/three-d-secure/shared/events');
var querystring = require('../../../../src/lib/querystring');

describe('initializeAuthenticationCompleteFrame', function () {
  it('emits an AUTHENTICATION_COMPLETE event on the bus with the parsed parameters', function () {
    var url = 'http://example.com/foo?boo=bar&baz=123&channel=abc123';
    var params = querystring.parse(url);

    initializeAuthenticationCompleteFrame(url);

    expect(Bus.prototype.emit).to.have.been.calledWith(events.AUTHENTICATION_COMPLETE, this.sandbox.match(params));
  });
});
