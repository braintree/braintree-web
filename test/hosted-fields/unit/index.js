'use strict';

var Bus = require('../../../src/lib/bus');
var Promise = require('../../../src/lib/promise');
var basicComponentVerification = require('../../../src/lib/basic-component-verification');
var events = require('../../../src/hosted-fields/shared/constants').events;
var hostedFields = require('../../../src/hosted-fields');
var HostedFields = require('../../../src/hosted-fields/external/hosted-fields');
var fake = require('../../helpers/fake');

function callFrameReadyHandler() {
  setTimeout(function () { // allow hosted fields to begin set up before finding bus handler
    var i, frameReadyHandler;

    for (i = 0; i < Bus.prototype.on.callCount; i++) {
      if (Bus.prototype.on.getCall(0).args[0] === events.FRAME_READY) {
        frameReadyHandler = Bus.prototype.on.getCall(0).args[1];
        break;
      }
    }

    frameReadyHandler(function () {});
  }, 100);
}

describe('hostedFields', function () {
  describe('create', function () {
    beforeEach(function () {
      this.fakeClient = fake.client();
      this.fakeClient._request = function () {};
      this.sandbox.stub(basicComponentVerification, 'verify').resolves();
    });

    it('verifies with basicComponentVerification', function (done) {
      var client = this.fakeClient;

      hostedFields.create({
        client: client,
        fields: {
          cvv: {selector: '#cvv'}
        }
      }, function () {
        expect(basicComponentVerification.verify).to.be.calledOnce;
        expect(basicComponentVerification.verify).to.be.calledWith({
          name: 'Hosted Fields',
          client: client
        });
        done();
      });
    });

    it('instantiates a Hosted Fields integration', function (done) {
      var cvvNode = document.createElement('div');

      cvvNode.id = 'cvv';
      document.body.appendChild(cvvNode);

      hostedFields.create({
        client: this.fakeClient,
        fields: {
          cvv: {selector: '#cvv'}
        }
      }, function (err, thingy) {
        expect(err).not.to.exist;
        expect(thingy).to.be.an.instanceof(HostedFields);

        done();
      });

      callFrameReadyHandler();
    });

    it('returns a promise', function () {
      var promise;
      var cvvNode = document.createElement('div');

      cvvNode.id = 'cvv';
      document.body.appendChild(cvvNode);

      promise = hostedFields.create({
        client: this.fakeClient,
        fields: {
          cvv: {selector: '#cvv'}
        }
      });

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('returns error if hosted fields integration throws an error', function (done) {
      hostedFields.create({
        fields: {
          cvv: {selector: '#cvv'}
        }
      }, function (err) {
        expect(err).to.exist;

        done();
      });
    });
  });

  describe('supportsInputFormatting', function () {
    it('returns a boolean', function () {
      expect(hostedFields.supportsInputFormatting()).to.be.a('boolean');
    });
  });
});
