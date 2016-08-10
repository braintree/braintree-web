'use strict';

var lookupTable = {
  us: 'en_us',
  gb: 'en_uk',
  uk: 'en_uk',
  de: 'de_de',
  fr: 'fr_fr',
  it: 'it_it',
  es: 'es_es',
  ca: 'en_ca',
  au: 'en_au',
  at: 'de_de',
  be: 'en_us',
  ch: 'de_de',
  dk: 'da_dk',
  nl: 'nl_nl',
  no: 'no_no',
  pl: 'pl_pl',
  se: 'sv_se',
  tr: 'tr_tr',
  bg: 'en_us',
  cy: 'en_us',
  hr: 'en_us',
  is: 'en_us',
  kh: 'en_us',
  mt: 'en_us',
  my: 'en_us',
  ru: 'ru_ru'
};

function getCountry(code) {
  var country = code ? code.toLowerCase().replace(/-/g, '_') : 'us';

  if (country.indexOf('_') !== -1) {
    country = country.split('_')[1];
  }

  country = lookupTable[country] ? country : 'us';

  if (country === 'uk') {
    country = 'gb';
  }

  return country;
}

module.exports = getCountry;
