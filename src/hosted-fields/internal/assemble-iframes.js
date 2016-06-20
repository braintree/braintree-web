'use strict';

function assembleIFrames(win) {
  var i, frame;
  var frames = [];

  for (i = 0; i < win.frames.length; i++) {
    frame = win.frames[i];

    try {
      if (frame.location.href === window.location.href) {
        frames.push(frame);
      }
    } catch (e) { /* ignored */ }
  }

  return frames;
}

module.exports = {
  assembleIFrames: assembleIFrames
};
