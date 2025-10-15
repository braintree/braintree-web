"use strict";

module.exports = {
  detectIncognito: function () {
    return Promise.resolve({
      isPrivate: false,
      browserName: "test",
    });
  },
};
