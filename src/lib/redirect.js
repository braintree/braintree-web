'use strict';

function sync(url) {
  global.location.href = url;
}

module.exports = {
  sync: sync
};
