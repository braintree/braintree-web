'use strict';

var getFrameName = require('../../../../src/hosted-fields/internal/get-frame-name').getFrameName;

describe('getFrameName', function () {
  beforeEach(function () {
    this.oldWindowName = window.name;
  });

  afterEach(function () {
    window.name = this.oldWindowName;
  });

  it('replaces braintree-hosted-field in window name', function () {
    window.name = 'braintree-hosted-field-foo';
    expect(getFrameName()).to.equal('foo');
  });

  it('replaces braintree-hosted-field in any position', function () {
    window.name = 'foo-bar-braintree-hosted-field-baz';
    expect(getFrameName()).to.equal('foo-bar-baz');
  });

  it('returns window.name if braintree-hosted-field is not in it', function () {
    window.name = 'really-cool-window';
    expect(getFrameName()).to.equal('really-cool-window');
  });

  it('does not replace multiple occurrences of braintree-hosted-field', function () {
    window.name = 'foo-braintree-hosted-field-bar-braintree-hosted-field-baz';
    expect(getFrameName()).to.equal('foo-bar-braintree-hosted-field-baz');
  });

  it('returns an empty string if window.name is an empty string', function () {
    window.name = '';
    expect(getFrameName()).to.equal('');
  });
});
