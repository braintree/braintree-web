'use strict';

var constants = require('../../../../src/hosted-fields/shared/constants');
var composeUrl = require('../../../../src/hosted-fields/external/compose-url');

describe('compose url', function () {
  it('returns a fully qualified url', function () {
    var actual = composeUrl('https://localhost', 'fake-channel');

    expect(actual).to.equal('https://localhost/web/' + constants.VERSION + '/html/hosted-fields-frame.min.html#fake-channel');
  });

  it('returns a fully qualified url when explicitly not in debug mode', function () {
    var actual = composeUrl('https://localhost', 'fake-channel', false);

    expect(actual).to.equal('https://localhost/web/' + constants.VERSION + '/html/hosted-fields-frame.min.html#fake-channel');
  });

  it('returns a fully qualified unminified url when in debug mode', function () {
    var actual = composeUrl('https://localhost', 'fake-channel', true);

    expect(actual).to.equal('https://localhost/web/' + constants.VERSION + '/html/hosted-fields-frame.html#fake-channel');
  });
});
