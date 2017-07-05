'use strict';

var translations = {
  en: require('./translations/en_US'),
  nl: require('./translations/nl_NL')
};
var DEFAULT_LOCALE = 'nl';

module.exports = function (locale) {
  var shortLocale;

  locale = locale || DEFAULT_LOCALE;

  if (translations.hasOwnProperty(locale)) {
    return translations[locale];
  }

  shortLocale = locale.split('_')[0];

  if (translations.hasOwnProperty(shortLocale)) {
    return translations[shortLocale];
  }

  return translations[DEFAULT_LOCALE];
};
