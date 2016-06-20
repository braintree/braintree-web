'use strict';

var assembleIFrames = require('../../../../src/hosted-fields/internal/assemble-iframes').assembleIFrames;

describe('assembleIFrames', function () {
  it('iterates through window.frames to find frames on the same origin', function () {
    var myHref = location.href;

    var frameA = {
      location: {href: myHref},
      frames: []
    };
    var frameB = {
      location: {href: myHref},
      frames: []
    };
    var frameC = {
      location: {href: myHref},
      frames: [
        {
          location: {href: 'http://example.com'},
          frames: []
        },
        frameB
      ]
    };

    var fakeWindow = {
      frames: [
        frameA,
        {
          location: {href: 'http://bing.com'},
          frames: []
        },
        {
          // location deliberately missing to throw error
          frames: []
        },
        frameC
      ]
    };

    var result = assembleIFrames(fakeWindow);

    expect(result).to.have.lengthOf(2);
    expect(result[0]).to.equal(frameA);
    expect(result[1]).to.equal(frameC);
  });
});
