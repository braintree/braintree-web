'use strict';

var openPopup = require('../../../../../../src/lib/frame-service/external/popup/open');

describe('openPopup', function () {
  it('calls to window.open', function () {
    var options = {
      name: 'name',
      openFrameUrl: 'landing-frame-url'
    };

    this.sandbox.stub(global, 'open');

    openPopup(options);

    expect(global.open).to.have.been.calledWith(
      'landing-frame-url',
      'name',
      sinon.match.string
    );
  });
});
