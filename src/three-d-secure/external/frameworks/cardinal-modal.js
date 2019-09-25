'use strict';

var SongbirdFramework = require('./songbird');

function CardinalModalFramework(options) {
  SongbirdFramework.call(this, options);
}

CardinalModalFramework.prototype = Object.create(SongbirdFramework.prototype, {
  constructor: SongbirdFramework
});

module.exports = CardinalModalFramework;
