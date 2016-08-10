'use strict';

var constants = require('../../../../src/hosted-fields/shared/constants');
var composeUrl = require('../../../../src/hosted-fields/external/compose-url');

describe('compose url', function () {
  it('returns a fully qualified url', function () {
    var actual = composeUrl('https://localhost', 'fake-channel');

    expect(actual).to.equal('https://localhost/web/' + constants.VERSION + '/html/hosted-fields-frame@DOT_MIN.html#fake-channel');
  });
});
