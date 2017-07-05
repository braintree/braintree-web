'use strict';

var translator = require('../../../../src/ideal/internal/translator');

describe('translator', function () {
  it('returns the translations for provided locale', function () {
    var translations = translator('en_US');

    expect(translations.idealBack).to.equal('Back');
    expect(translations.idealSelectYourBank).to.equal('Select Your Bank');
  });

  it('defaults to Dutch when no locale is provided', function () {
    var translations = translator();

    expect(translations.idealBack).to.equal('Terug');
    expect(translations.idealSelectYourBank).to.equal('Selecteer uw bank');
  });

  it('defaults to basic version of language if country specific version does not exist', function () {
    var translations = translator('en_GB');

    expect(translations.idealBack).to.equal('Back');
    expect(translations.idealSelectYourBank).to.equal('Select Your Bank');
  });

  it('defaults to Dutch when no compatible locale can be found', function () {
    var translations = translator('INVALID_LOCALE');

    expect(translations.idealBack).to.equal('Terug');
    expect(translations.idealSelectYourBank).to.equal('Selecteer uw bank');
  });
});
