'use strict';

var defaults = require('../../karma-config-defaults');

var files = defaults.files.concat([{
  pattern: 'config/fake-logo.png',
  watched: false,
  included: false,
  served: true
}]);

module.exports = function (config) {
  config.set(Object.assign({}, defaults, {
    basePath: '../',
    files: files,
    proxies: { // prevents 404s for images that don't exist
      '/static/images/ideal_issuer-logo_INGBNL2A.png': '/base/config/fake-logo.png',
      '/static/images/ideal_issuer-logo_onloaddoSomethingBadignored-property': '/base/config/fake-logo.png',
      '/static/images/ideal_issuer-logo_sketchy.png': '/base/config/fake-logo.png',
      '/static/images/ideal_issuer-logo_foo.png': '/base/config/fake-logo.png'
    }
  }));
};
