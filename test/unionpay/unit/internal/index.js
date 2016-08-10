'use strict';

var internal = require('../../../../src/unionpay/internal/index');
var Bus = require('../../../../src/lib/bus');
var BraintreeError = require('../../../../src/lib/error');
var fake = require('../../../helpers/fake');
var getHostedFieldsCardForm = require('../../../../src/unionpay/internal/get-hosted-fields-cardform');
var UnionPay = require('../../../../src/unionpay/shared/unionpay');
var events = require('../../../../src/unionpay/shared/constants').events;

describe('internal', function () {
  beforeEach(function () {
    this._oldGlobalName = global.name;
    global.name = 'frame-name_123';
  });

  afterEach(function () {
    global.name = this._oldGlobalName;
  });

  describe('create', function () {
    it('creates a global bus', function () {
      internal.create();

      expect(global.bus.channel).to.equal('123');
    });

    it('emits a CONFIGURATION_REQUEST event', function () {
      internal.create();

      expect(Bus.prototype.emit).to.have.been.calledWith(Bus.events.CONFIGURATION_REQUEST, this.sandbox.match.func);
    });
  });

  describe('initialize', function () {
    beforeEach(function () {
      internal.create();

      this.initialize = Bus.prototype.emit.lastCall.args[1];
      this.configuration = fake.configuration();
      this.configuration.gatewayConfiguration.unionPay = {
        enabled: true
      };
    });

    describe('fetchCapabilities', function () {
      it('sets up bus for HOSTED_FIELDS_FETCH_CAPABILITIES', function () {
        this.initialize(this.configuration);

        expect(Bus.prototype.on).to.have.been.calledWith(events.HOSTED_FIELDS_FETCH_CAPABILITIES, this.sandbox.match.func);
      });

      it('fetches capabilities when a card form exists', function (done) {
        var fetchHandler, i;
        var fakeError = new Error('you goofed!');
        var fakePayload = {isUnionPay: false};

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_FETCH_CAPABILITIES) {
            fetchHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns({
          get: function (property) {
            expect(property).to.equal('number.value');
            return '4111111111111111';
          }
        });

        this.sandbox.stub(UnionPay.prototype, 'fetchCapabilities', function (options, callback) {
          expect(options.card.number).to.equal('4111111111111111');
          callback(fakeError, fakePayload);
        });

        fetchHandler({hostedFields: {}}, function (options) {
          expect(options.err).to.equal(fakeError);
          expect(options.payload).to.equal(fakePayload);

          done();
        });
      });

      it('calls the callback with an error if the card form does not exist', function (done) {
        var fetchHandler, i;
        var fakeHostedFields = {
          _bus: {channel: '12345'}
        };

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_FETCH_CAPABILITIES) {
            fetchHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns(null);

        this.sandbox.stub(UnionPay.prototype, 'fetchCapabilities');

        fetchHandler({hostedFields: fakeHostedFields}, function (options) {
          expect(options.err).to.be.an.instanceof(BraintreeError);
          expect(options.err.type).to.equal('MERCHANT');
          expect(options.err.code).to.equal('UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED');
          expect(options.err.message).to.equal('Could not find the Hosted Fields instance.');

          expect(options.payload).not.to.exist;

          expect(UnionPay.prototype.fetchCapabilities).not.to.have.beenCalled;

          done();
        });
      });
    });

    describe('enroll', function () {
      it('sets up bus for HOSTED_FIELDS_ENROLL', function () {
        this.initialize(this.configuration);

        expect(Bus.prototype.on).to.have.been.calledWith(events.HOSTED_FIELDS_ENROLL, this.sandbox.match.func);
      });

      it('enrolls when a card form exists', function (done) {
        var enrollHandler, i;
        var fakeError = new Error('you goofed!');
        var fakePayload = {unionPayEnrollmentId: '123abc'};

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_ENROLL) {
            enrollHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns({
          getCardData: function () {
            return {
              number: '4111111111111111',
              expirationMonth: '10',
              expirationYear: '2020'
            };
          }
        });

        this.sandbox.stub(UnionPay.prototype, 'enroll', function (options, callback) {
          expect(options).to.deep.equal({
            card: {
              number: '4111111111111111',
              expirationMonth: '10',
              expirationYear: '2020'
            },
            mobile: {
              countryCode: '62',
              number: '11111111'
            }
          });
          callback(fakeError, fakePayload);
        });

        enrollHandler({
          hostedFields: {},
          mobile: {
            countryCode: '62',
            number: '11111111'
          }
        }, function (options) {
          expect(options.err).to.equal(fakeError);
          expect(options.payload).to.equal(fakePayload);

          done();
        });
      });

      it('calls the callback with an error if the card form does not exist', function (done) {
        var enrollHandler, i;
        var fakeHostedFields = {
          _bus: {channel: '12345'}
        };

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_ENROLL) {
            enrollHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns(null);

        this.sandbox.stub(UnionPay.prototype, 'enroll');

        enrollHandler({
          hostedFields: fakeHostedFields,
          mobile: {
            countryCode: '62',
            number: '11111111111'
          }
        }, function (options) {
          expect(options.err).to.be.an.instanceof(BraintreeError);
          expect(options.err.type).to.equal('MERCHANT');
          expect(options.err.code).to.equal('UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED');
          expect(options.err.message).to.equal('Could not find the Hosted Fields instance.');

          expect(options.payload).not.to.exist;

          expect(UnionPay.prototype.enroll).not.to.have.beenCalled;

          done();
        });
      });
    });

    describe('tokenize', function () {
      it('sets up bus for HOSTED_FIELDS_TOKENIZE', function () {
        this.initialize(this.configuration);

        expect(Bus.prototype.on).to.have.been.calledWith(events.HOSTED_FIELDS_TOKENIZE, this.sandbox.match.func);
      });

      it('tokenizes when a card form exists', function (done) {
        var tokenizeHandler, i;
        var fakeError = new Error('you goofed!');
        var fakePayload = {nonce: 'abc123'};

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_TOKENIZE) {
            tokenizeHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns({
          getCardData: function () {
            return {
              number: '4111111111111111',
              expirationMonth: '10',
              expirationYear: '2020',
              cvv: '123'
            };
          }
        });

        this.sandbox.stub(UnionPay.prototype, 'tokenize', function (options, callback) {
          expect(options).to.deep.equal({
            enrollmentId: 'enrollmentId62',
            smsCode: '1234',
            card: {
              number: '4111111111111111',
              expirationMonth: '10',
              expirationYear: '2020',
              cvv: '123'
            },
            vault: false
          });

          callback(fakeError, fakePayload);
        });

        tokenizeHandler({
          hostedFields: {},
          enrollmentId: 'enrollmentId62',
          smsCode: '1234'
        }, function (options) {
          expect(options.err).to.equal(fakeError);
          expect(options.payload).to.equal(fakePayload);

          done();
        });
      });

      it('can vault tokenized unionpay card', function (done) {
        var tokenizeHandler, i;
        var fakeError = new Error('you goofed!');
        var fakePayload = {nonce: 'abc123'};

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_TOKENIZE) {
            tokenizeHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns({
          getCardData: function () {
            return {
              number: '4111111111111111',
              expirationMonth: '10',
              expirationYear: '2020',
              cvv: '123'
            };
          }
        });

        this.sandbox.stub(UnionPay.prototype, 'tokenize', function (options, callback) {
          expect(options).to.deep.equal({
            enrollmentId: 'enrollmentId62',
            smsCode: '1234',
            card: {
              number: '4111111111111111',
              expirationMonth: '10',
              expirationYear: '2020',
              cvv: '123'
            },
            vault: true
          });

          callback(fakeError, fakePayload);
        });

        tokenizeHandler({
          hostedFields: {},
          enrollmentId: 'enrollmentId62',
          smsCode: '1234',
          vault: true
        }, function (options) {
          expect(options.err).to.equal(fakeError);
          expect(options.payload).to.equal(fakePayload);

          done();
        });
      });

      it('calls the callback with an error if the card form does not exist', function (done) {
        var tokenizeHandler, i;
        var fakeHostedFields = {
          _bus: {channel: '12345'}
        };

        this.initialize(this.configuration);

        for (i = 0; i < Bus.prototype.on.callCount; i++) {
          if (Bus.prototype.on.getCall(i).args[0] === events.HOSTED_FIELDS_TOKENIZE) {
            tokenizeHandler = Bus.prototype.on.getCall(i).args[1];
            break;
          }
        }

        this.sandbox.stub(getHostedFieldsCardForm, 'get').returns(null);

        this.sandbox.stub(UnionPay.prototype, 'tokenize');

        tokenizeHandler({
          hostedFields: fakeHostedFields,
          options: {
            id: 'enrollmentId62',
            smsCode: '1234'
          }
        }, function (options) {
          expect(options.err).to.be.an.instanceof(BraintreeError);
          expect(options.err.type).to.equal('MERCHANT');
          expect(options.err.code).to.equal('UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED');
          expect(options.err.message).to.equal('Could not find the Hosted Fields instance.');

          expect(options.payload).not.to.exist;

          expect(UnionPay.prototype.tokenize).not.to.have.beenCalled;

          done();
        });
      });
    });
  });
});
