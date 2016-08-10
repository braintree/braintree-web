'use strict';

var composePopupOptions = require('../../../../../../src/lib/frame-service/external/popup/compose-options');
var position = require('../../../../../../src/lib/frame-service/external/popup/position');

describe('composeOptions', function () {
  it('returns a string of window params', function () {
    var result;

    this.sandbox.stub(position, 'top').returns('2');
    this.sandbox.stub(position, 'left').returns('3');

    result = composePopupOptions();

    expect(result).to.equal(
      'resizable,scrollbars,height=535,width=450,top=2,left=3'
    );
  });
});
