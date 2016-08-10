'use strict';

var prepBody = require('../../../../src/client/request/prep-body');

describe('prepBody', function () {
  it('stringifies object bodies for non GET requests', function () {
    var body = prepBody('post', {foo: 'bar'});

    expect(body).to.eql('{"foo":"bar"}');
  });

  it('handles non GET request bodies that are already a string', function () {
    var body = prepBody('post', 'foo');

    expect(body).to.eql('foo');
  });

  it('does not blow up if non GET body is null', function () {
    expect(function () {
      prepBody('post', null);
    }).to.not.throw();
  });

  it('throws an error if method is not a string', function () {
    expect(function () {
      prepBody(false, {});
    }).to.throw(/Method must be a string/);
  });
});
