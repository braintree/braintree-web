'use strict';

var addMetadata = require('../../../src/lib/add-metadata');

function clientTokenWithFingerprint(fingerprint) {
  return btoa(JSON.stringify({authorizationFingerprint: fingerprint}));
}

describe('_setAttrs', function () {
  it('sets tokenizationKey on the attributes', function () {
    var actual;
    var configuration = {
      authorization: 'development_testing_merchant_id',
      analyticsMetadata: {}
    };

    actual = addMetadata(configuration, {});

    expect(actual.tokenizationKey).to.equal('development_testing_merchant_id');
  });

  it('sets authorizationFingerprint on the attributes', function () {
    var actual;
    var configuration = {
      authorization: clientTokenWithFingerprint('auth fingerprint'),
      analyticsMetadata: {}
    };

    actual = addMetadata(configuration, {});

    expect(actual.authorizationFingerprint).to.equal('auth fingerprint');
  });

  it('sets _meta attributes from analyticsMetadata', function () {
    var actual;
    var configuration = {
      authorization: 'development_testing_merchant_id',
      analyticsMetadata: {
        jibberish: 'still there'
      }
    };

    actual = addMetadata(configuration, {});

    expect(actual._meta.jibberish).to.equal('still there');
  });

  it('preserves existing _meta values', function () {
    var actual;
    var configuration = {
      authorization: 'development_testing_merchant_id',
      analyticsMetadata: {
        jibberish: 'still there'
      }
    };

    actual = addMetadata(configuration, {
      _meta: {moreJibberish: 'should also be there'}
    });

    expect(actual._meta.jibberish).to.equal('still there');
    expect(actual._meta.moreJibberish).to.equal('should also be there');
  });
});
