'use strict';

var composePopupOptions = require('../../../../../../../src/lib/frame-service/external/strategies/popup/compose-options');
var position = require('../../../../../../../src/lib/frame-service/external/strategies/popup/position');

describe('composeOptions', function () {
  it('returns a string of window params with configured height and width', function () {
    var result;

    this.sandbox.stub(position, 'top').returns('2');
    this.sandbox.stub(position, 'left').returns('3');

    result = composePopupOptions({
      height: 123,
      width: 456
    });

    expect(result).to.equal(
      'resizable,scrollbars,height=123,width=456,top=2,left=3'
    );
  });

  it('returns a string of window params with configured top and left', function () {
    var result;

    result = composePopupOptions({
      height: 123,
      width: 456,
      top: 10,
      left: 20
    });

    expect(result).to.equal(
      'resizable,scrollbars,height=123,width=456,top=10,left=20'
    );
  });

  it('allows passing in top and left of 0', function () {
    var result;

    result = composePopupOptions({
      height: 123,
      width: 456,
      top: 0,
      left: 0
    });

    expect(result).to.equal(
      'resizable,scrollbars,height=123,width=456,top=0,left=0'
    );
  });
});
