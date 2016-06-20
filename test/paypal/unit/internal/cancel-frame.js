'use strict';

var cancelFrame = require('../../../../src/paypal/internal/cancel-frame');
var constants = require('../../../../src/lib/frame-service/shared/constants');
var frameService = require('../../../../src/lib/frame-service/internal');
var BraintreeError = require('../../../../src/lib/error');

describe('cancel-frame', function () {
  describe('start', function () {
    it('reports an error to frameService', function () {
      var err = {
        type: BraintreeError.types.CUSTOMER,
        message: constants.FRAME_CLOSED_ERROR_MESSAGE
      };

      this.sandbox.stub(frameService, 'report');
      cancelFrame.start();

      expect(frameService.report).to.have.been.calledWith(
        sinon.match(err)
      );
    });

    it('async calls global.close()', function (done) {
      this.sandbox.stub(global, 'close');
      this.sandbox.stub(frameService, 'report');

      cancelFrame.start();
      expect(global.close).to.not.have.been.called;

      setTimeout(function () {
        expect(global.close).to.have.been.called;
        done();
      }, constants.POPUP_CLOSE_TIMEOUT + 10);
    });
  });
});

