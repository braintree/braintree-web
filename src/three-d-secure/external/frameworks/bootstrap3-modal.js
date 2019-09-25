'use strict';

var SongbirdFramework = require('./songbird');

function Bootstrap3ModalFramework(options) {
  SongbirdFramework.call(this, options);
}

Bootstrap3ModalFramework.prototype = Object.create(SongbirdFramework.prototype, {
  constructor: SongbirdFramework
});

Bootstrap3ModalFramework.prototype._createCardinalConfigurationOptions = function (setupOptions) {
  var options = SongbirdFramework.prototype._createCardinalConfigurationOptions.call(this, setupOptions);

  options.payment = {
    framework: 'bootstrap3'
  };

  return options;
};

module.exports = Bootstrap3ModalFramework;
