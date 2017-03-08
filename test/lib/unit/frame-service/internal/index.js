'use strict';

var frameService = require('../../../../../src/lib/frame-service/internal/index');
var events = require('../../../../../src/lib/frame-service/shared/events');
var constants = require('../../../../../src/lib/frame-service/shared/constants');

describe('frame-service', function () {
  beforeEach(function () {
    this.id = 'id';
    global.opener = {
      frames: {}
    };
  });

  describe('getFrame', function () {
    it('to return a frame', function () {
      global.name = constants.DISPATCH_FRAME_NAME + '_' + this.id;
      global.opener.frames[constants.DISPATCH_FRAME_NAME + '_' + this.id] = 'frame';

      expect(frameService.getFrame()).to.equal('frame');
    });

    it('throws an error when frame is empty', function () {
      expect(function () {
        return frameService.getFrame();
      }).to.throw('Braintree is inactive');
    });
  });

  describe('report', function () {
    it('emits an error and a payload', function () {
      var frame = {
        bus: {
          emit: function () {}
        }
      };

      this.sandbox.spy(frame.bus, 'emit');
      global.name = constants.DISPATCH_FRAME_NAME + '_' + this.id;
      global.opener.frames[constants.DISPATCH_FRAME_NAME + '_' + this.id] = frame;

      frameService.report('err', 'payload');

      expect(frame.bus.emit).to.be.calledOnce;
      expect(frame.bus.emit).to.be.calledWith(events.DISPATCH_FRAME_REPORT, {
        err: 'err',
        payload: 'payload'
      });
    });
  });

  describe('asyncClose', function () {
    it('async call to global.close', function (done) {
      this.sandbox.stub(global, 'close');
      frameService.asyncClose();

      setTimeout(function () {
        expect(global.close).to.be.called;
        done();
      }, constants.POPUP_CLOSE_TIMEOUT + 10);
    });
  });
});

