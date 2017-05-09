'use strict';

var redirectFrame = require('../../../../src/ideal/internal/redirect-frame');
var Bus = require('../../../../src/lib/bus');

describe('redirect-frame', function () {
  beforeEach(function () {
    this.oldWindowName = window.name;

    window.name = 'braintree_uuid';

    this.sandbox.stub(Bus.prototype, 'emit');
  });

  afterEach(function () {
    window.name = this.oldWindowName;
  });

  it('emits ideal:REDIRECT_PAGE_REACHED event', function () {
    redirectFrame.start();

    expect(Bus.prototype.emit).to.be.calledOnce;
    expect(Bus.prototype.emit).to.be.calledWith('ideal:REDIRECT_PAGE_REACHED');
  });
});
