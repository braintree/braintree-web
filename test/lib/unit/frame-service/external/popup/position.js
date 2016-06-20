'use strict';

var popupPosition = require('../../../../../../src/lib/frame-service/external/popup/position');

describe('popup position', function () {
  describe('center', function () {
    it('centers over a smaller window size', function () {
      var wHeight = 300;
      var pHeight = 470;
      var wTop = 0;
      var actual = popupPosition.center(wHeight, pHeight, wTop);

      expect(actual).to.equal(-85);
    });

    it('centers over a larger window size', function () {
      var wHeight = 940;
      var pHeight = 470;
      var wTop = 0;
      var actual = popupPosition.center(wHeight, pHeight, wTop);

      expect(actual).to.equal(235);
    });
  });
});
