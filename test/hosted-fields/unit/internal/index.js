'use strict';

var internal = require('../../../../src/hosted-fields/internal/index');
var getFrameName = require('../../../../src/hosted-fields/internal/get-frame-name');
var events = require('../../../../src/hosted-fields/shared/constants').events;
var CreditCardForm = require('../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var Bus = require('../../../../src/lib/bus');
var analytics = require('../../../../src/lib/analytics');
var fake = require('../../../helpers/fake');
var assembleIFrames = require('../../../../src/hosted-fields/internal/assemble-iframes');
var BraintreeError = require('../../../../src/lib/error');

describe('internal', function () {
  beforeEach(function () {
    location.hash = 'fake-channel';

    this.fakeConfig = {
      fields: {
        number: {}
      }
    };
    this.cardForm = new CreditCardForm(this.fakeConfig);

    this.type = 'number';

    this.sandbox.stub(getFrameName, 'getFrameName', function () {
      return this.type;
    }.bind(this));

    internal.initialize(this.cardForm);
  });

  describe('initialize', function () {
    it('creates an input element', function () {
      var inputs = document.querySelectorAll('input');

      expect(inputs).to.have.length(1);
    });

    it('makes the input have a transparent background', function () {
      var input = document.querySelector('input');
      var background = window.getComputedStyle(input, null).getPropertyValue('background-color');

      expect(background.replace(/\s/g, '')).to.equal('rgba(0,0,0,0)');
    });

    it('gives the input a class of the proper type', function () {
      var input = document.querySelector('input');

      expect(input.classList.contains('number')).to.be.true;
    });

    it('triggers events on the bus when events occur', function () {
      var input = document.querySelector('input');

      this.sandbox.stub(CreditCardForm.prototype, 'emitEvent');

      triggerEvent('focus', input);
      triggerEvent('blur', input);
      triggerEvent('click', input);  // not whitelisted
      triggerEvent('keyup', input);  // not whitelisted

      expect(CreditCardForm.prototype.emitEvent).to.have.been.calledWith('number', 'focus');
      expect(CreditCardForm.prototype.emitEvent).to.have.been.calledWith('number', 'blur');
      expect(CreditCardForm.prototype.emitEvent).not.to.have.been.calledWith('number', 'click');
      expect(CreditCardForm.prototype.emitEvent).not.to.have.been.calledWith('number', 'keyup');
    });
  });

  describe('create', function () {
    it('creates a global bus', function () {
      var originalLocationHash = location.hash;

      location.hash = '#test-uuid';
      internal.create();
      expect(global.bus.channel).to.equal('test-uuid');

      location.hash = originalLocationHash;
    });
  });

  describe('orchestrate', function () {
    beforeEach(function () {
      var i, args;

      internal.create();

      for (i = 0; i < Bus.prototype.emit.callCount; i++) {
        args = Bus.prototype.emit.getCall(i).args;
        if (args[0] === events.FRAME_READY) {
          this.orchestrate = args[1];
          break;
        }
      }
    });

    it('posts an analytics event', function () {
      this.sandbox.stub(analytics, 'sendEvent');
      this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

      this.orchestrate({
        client: fake.configuration(),
        fields: {
          number: {selector: '#foo'},
          cvv: {selector: '#boo'},
          postalCode: {selector: '#you'}
        }
      });

      expect(analytics.sendEvent).to.have.been.calledWith(this.sandbox.match.object, 'web.custom.hosted-fields.load.succeeded');
    });
  });

  describe('createTokenizationHandler', function () {
    var create = internal.createTokenizationHandler;
    var fakeError = new Error('you done goofed');

    fakeError.errors = [];

    beforeEach(function () {
      var self = this;

      this.sandbox.stub(analytics, 'sendEvent');

      this.details = {
        isValid: true,
        isEmpty: false,
        someOtherStuff: null
      };
      this.fakeNonce = 'nonce homeboy';
      this.fakeDetails = 'yas';
      this.fakeType = 'YASS';
      this.fakeDescription = 'fake description';
      this.fakeOptions = {foo: 'bar'};

      this.goodClient = {
        request: function (_, callback) {
          callback(null, {
            creditCards: [{
              nonce: self.fakeNonce,
              details: self.fakeDetails,
              description: self.fakeDescription,
              type: self.fakeType,
              foo: 'bar'
            }]
          });
        }
      };

      this.badClient = {
        request: function (_, callback) {
          callback(fakeError, null, 500);
        }
      };

      this.emptyCardForm = this.cardForm;
      this.emptyCardForm.isEmpty = function () { return true; };

      this.validCardForm = new CreditCardForm(this.fakeConfig);
      this.validCardForm.isEmpty = function () { return false; };
      this.validCardForm.invalidFieldKeys = function () { return []; };

      this.invalidCardForm = new CreditCardForm(this.fakeConfig);
      this.invalidCardForm.isEmpty = function () { return false; };
      this.invalidCardForm.invalidFieldKeys = function () { return ['cvv']; };
    });

    it('returns a function', function () {
      expect(create(this.goodClient, this.cardForm)).to.be.a('function');
    });

    it('replies with an error if tokenization fails due to network', function (done) {
      create(this.badClient, this.validCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR');
        expect(err.message).to.equal('A tokenization network error occurred.');
        expect(err.details.originalError.message).to.equal('you done goofed');
        expect(err.details.originalError.errors).to.equal(fakeError.errors);

        done();
      });
    });

    it('replies with an error if tokenization fails due to card data', function (done) {
      this.badClient.request = function (_, callback) {
        callback(fakeError, null, 422);
      };

      create(this.badClient, this.validCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_FAILED_TOKENIZATION');
        expect(err.message).to.equal('The supplied card data failed tokenization.');
        expect(err.details.originalError.message).to.equal('you done goofed');
        expect(err.details.originalError.errors).to.equal(fakeError.errors);

        done();
      });
    });

    it('sends an analytics event if tokenization fails', function () {
      create(this.badClient, this.validCardForm)(this.fakeOptions, function () {});

      expect(analytics.sendEvent).to.have.been.calledWith(this.sandbox.match.object, 'web.custom.hosted-fields.tokenization.failed');
    });

    it('replies with data if tokenization succeeds', function () {
      var reply = this.sandbox.spy();

      create(this.goodClient, this.validCardForm)(this.fakeOptions, reply);

      expect(reply).to.have.been.calledWith([null, {
        nonce: this.fakeNonce,
        details: this.fakeDetails,
        description: this.fakeDescription,
        type: this.fakeType
      }]);
    });

    it('sends an analytics event if tokenization succeeds', function () {
      create(this.goodClient, this.validCardForm)(this.fakeOptions, function () {});

      expect(analytics.sendEvent).to.have.been.calledWith(this.sandbox.match.object, 'web.custom.hosted-fields.tokenization.succeeded');
    });

    it('replies with an error if all fields are empty', function (done) {
      create(this.goodClient, this.emptyCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELDS_EMPTY');
        expect(err.message).to.equal('All fields are empty. Cannot tokenize empty card fields.');
        expect(err.details).not.to.exist;

        done();
      });
    });

    it('replies with an error when some fields are invalid', function (done) {
      create(this.goodClient, this.invalidCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELDS_INVALID');
        expect(err.message).to.equal('Some payment input fields are invalid. Cannot tokenize invalid card fields.');
        expect(err.details).to.deep.equal({
          invalidFieldKeys: ['cvv']
        });

        done();
      });
    });

    it('makes a client request with validate false if the vault option is not provided', function () {
      var reply = this.sandbox.spy();

      this.goodClient.request = this.sandbox.stub();

      create(this.goodClient, this.validCardForm)(this.fakeOptions, reply);

      expect(this.goodClient.request).to.be.calledWithMatch({
        data: {
          creditCard: {
            options: {
              validate: false
            }
          }
        }
      });
    });

    it('makes a client request without validate false if the vault option is not provided', function () {
      var reply = this.sandbox.spy();

      this.goodClient.request = this.sandbox.stub();

      create(this.goodClient, this.validCardForm)({vault: true}, reply);

      expect(this.goodClient.request).not.to.be.calledWithMatch({
        data: {
          creditCard: {
            options: {
              validate: false
            }
          }
        }
      });
    });
  });
});
