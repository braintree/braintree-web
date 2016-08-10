'use strict';

var parseBody = require('../../../../src/client/request/parse-body');

describe('parseBody', function () {
  it('parses body as JSON', function () {
    var body = parseBody('{"foo":"bar"}');

    expect(body).to.eql({foo: 'bar'});
  });

  it('returns body if it is invalid JSON ', function () {
    var body = parseBody('{"invalid"}');

    expect(body).to.eql('{"invalid"}');
  });
});
