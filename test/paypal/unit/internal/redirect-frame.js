'use strict';

var redirectFrame = require('../../../../src/paypal/internal/redirect-frame');
var querystring = require('../../../../src/lib/querystring');
var frameService = require('../../../../src/lib/frame-service/internal');

describe('redirect-frame', function () {
  describe('start', function () {
    beforeEach(function () {
      this.params = {};
      this.sandbox.stub(frameService, 'report');
      this.sandbox.stub(frameService, 'asyncClose');
      this.sandbox.stub(querystring, 'parse', function () {
        return this.params;
      }.bind(this));
    });

    it('reports to frame service the params from the querystring', function () {
      redirectFrame.start();
      expect(frameService.report).to.have.been.calledWith(null, this.params);
    });

    it('closes the page', function () {
      redirectFrame.start();
      expect(frameService.asyncClose).to.have.been.called;
    });
  });
});
