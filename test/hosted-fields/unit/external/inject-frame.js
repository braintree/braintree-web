'use strict';

var injectFrame = require('../../../../src/hosted-fields/external/inject-frame');

describe('injectFrame', function () {
  it('adds frame to container and returns it as result', function () {
    var frame = document.createElement('iframe');
    var container = document.createElement('div');
    var result = injectFrame(frame, container);

    expect(container.children[0]).to.equal(frame);
    expect(result[0]).to.equal(frame);
  });

  it('adds clear: both element to the container and returns it in the result', function () {
    var frame = document.createElement('iframe');
    var container = document.createElement('div');
    var result = injectFrame(frame, container);

    expect(container.children[1]).to.be.an.instanceof(HTMLDivElement);
    expect(result[1].style.clear).to.equal('both');
    expect(container.children[1]).to.equal(result[1]);
  });
});

