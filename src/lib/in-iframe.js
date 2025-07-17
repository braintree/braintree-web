"use strict";

module.exports = function inIframe(win) {
  win = win || window;

  try {
    return win.self !== win.top;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return true;
  }
};
