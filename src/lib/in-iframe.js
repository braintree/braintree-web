'use strict';

module.exports = function inIframe(win) {
  win = win || window;

  try {
    return win.self !== win.top;
  } catch (e) {
    return true;
  }
};
