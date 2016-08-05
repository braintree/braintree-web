'use strict';

var Bus = require('../../../src/lib/bus');
var events = require('../../../src/hosted-fields/shared/constants').events;
var hostedFields = require('../../../src/hosted-fields');
var HostedFields = require('../../../src/hosted-fields/external/hosted-fields');
var fake = require('../../helpers/fake');
var BraintreeError = require('../../../src/lib/error');

describe('hostedFields', function () {
  describe('create', function () {
    it('instantiates a Hosted Fields integration', function (done) {
      var i, frameReadyHandler;
      var cvvNode = document.createElement('div');

      cvvNode.id = 'cvv';
      document.body.appendChild(cvvNode);

      hostedFields.create({
        client: {
          getConfiguration: fake.configuration,
          _request: function () {}
        },
        fields: {
          cvv: {selector: '#cvv'}
        }
      }, function (err, thingy) {
        expect(err).not.to.exist;
        expect(thingy).to.be.an.instanceof(HostedFields);

        done();
      });

      for (i = 0; i < Bus.prototype.on.callCount; i++) {
        if (Bus.prototype.on.getCall(0).args[0] === events.FRAME_READY) {
          frameReadyHandler = Bus.prototype.on.getCall(0).args[1];
          break;
        }
      }

      frameReadyHandler(function () {});
    });

    it('throws an error if called without a callback', function () {
      var err;
      var cvvNode = document.createElement('div');

      cvvNode.id = 'cvv';
      document.body.appendChild(cvvNode);

      try {
        hostedFields.create({
          client: {
            getConfiguration: fake.configuration,
            _request: function () {}
          },
          fields: {
            cvv: {selector: '#cvv'}
          }
        });
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.code).to.equal('CALLBACK_REQUIRED');
      expect(err.message).to.equal('create must include a callback function.');
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
});
