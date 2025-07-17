"use strict";

function assembleIFrames(win) {
  var i, frame;
  var frames = [];

  for (i = 0; i < win.frames.length; i++) {
    frame = win.frames[i];

    try {
      if (frame.location.href === window.location.href) {
        frames.push(frame);
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      /* ignored */
    }
  }

  return frames;
}

module.exports = {
  assembleIFrames: assembleIFrames,
};
