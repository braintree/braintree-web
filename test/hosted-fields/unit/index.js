'use strict';

var Bus = require('../../../src/lib/bus');
var Promise = require('../../../src/lib/promise');
var events = require('../../../src/hosted-fields/shared/constants').events;
var hostedFields = require('../../../src/hosted-fields');
var HostedFields = require('../../../src/hosted-fields/external/hosted-fields');
var fake = require('../../helpers/fake');

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

    it('returns a promise', function () {
      var promise;
      var cvvNode = document.createElement('div');

      cvvNode.id = 'cvv';
      document.body.appendChild(cvvNode);

      promise = hostedFields.create({
        client: {
          getConfiguration: fake.configuration,
          _request: function () {}
        },
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
