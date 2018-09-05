'use strict';

var Bus = require('../../../../src/lib/bus');
var HostedFields = require('../../../../src/hosted-fields/external/hosted-fields');
var constants = require('../../../../src/hosted-fields/shared/constants');
var events = constants.events;
var Destructor = require('../../../../src/lib/destructor');
var EventEmitter = require('../../../../src/lib/event-emitter');
var BraintreeError = require('../../../../src/lib/braintree-error');
var Promise = require('../../../../src/lib/promise');
var fake = require('../../../helpers/fake');
var rejectIfResolves = require('../../../helpers/promise-helper').rejectIfResolves;
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var getCardTypes = require('../../../../src/hosted-fields/shared/get-card-types');

describe('HostedFields', function () {
  beforeEach(function () {
    this.numberDiv = document.createElement('div');
    this.numberDiv.id = 'number';
    document.body.appendChild(this.numberDiv);

    this.defaultConfiguration = {
      client: fake.client(),
      fields: {
        number: {
          selector: '#number'
        }
      }
    };

    this.defaultConfiguration.client._request = function () {};
    this.sandbox.stub(analytics, 'sendEvent');
  });

  afterEach(function () {
    this.numberDiv.parentNode.removeChild(this.numberDiv);
  });

  describe('Constructor', function () {
    it('inherits from EventEmitter', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance).to.be.an.instanceof(EventEmitter);
    });

    it('creates a Destructor instance', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._destructor).to.be.an.instanceof(Destructor);
    });

    it('creates a bus instance', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._bus).to.be.an.instanceof(Bus);
    });

    it('sends an analytics event', function () {
      var client = this.defaultConfiguration.client;

      new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new

      expect(analytics.sendEvent).to.be.calledWith(client, 'custom.hosted-fields.initialized');
    });

    it('errors if no fields are provided', function () {
      var error;

      delete this.defaultConfiguration.fields;

      try {
        new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new
      } catch (e) {
        error = e;
      }

      expect(error).to.be.an.instanceof(BraintreeError);
      expect(error.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
    });

    it('errors if no fields keys are provided', function () {
      var error;

      this.defaultConfiguration.fields = {};

      try {
        new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new
      } catch (e) {
        error = e;
      }

      expect(error).to.be.an.instanceof(BraintreeError);
      expect(error.code).to.equal('INSTANTIATION_OPTION_REQUIRED');
    });

    it('sends a timeout event if the fields take too long to set up', function () {
      var client = this.defaultConfiguration.client;
      var clock = this.sandbox.useFakeTimers();

      new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new

      clock.tick(59999);
      expect(analytics.sendEvent).not.to.be.calledWith(client, 'custom.hosted-fields.load.timed-out');

      clock.tick(1);
      expect(analytics.sendEvent).to.be.calledWith(client, 'custom.hosted-fields.load.timed-out');
    });

    it('emits a timeout event if the fields take too long to set up', function () {
      var instance;
      var clock = this.sandbox.useFakeTimers();

      instance = new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new

      this.sandbox.stub(instance, '_emit');

      clock.tick(59999);
      expect(instance._emit).not.to.be.calledWith('timeout');

      clock.tick(1);
      expect(instance._emit).to.be.calledWith('timeout');
    });

    it('subscribes to FRAME_READY', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._bus.on).to.be.calledWith(events.FRAME_READY, this.sandbox.match.func);
    });

    it('replies with configuration, only to the final FRAME_READY', function () {
      var instance, i, frameReadyHandler;
      var configuration = this.defaultConfiguration;
      var replyStub = this.sandbox.stub();
      var numberNode = document.createElement('div');
      var cvvNode = document.createElement('div');
      var expirationDateNode = document.createElement('div');

      numberNode.id = 'number';
      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(numberNode);
      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: {selector: '#number'},
        cvv: {selector: '#cvv'},
        expirationDate: {selector: '#expirationDate'}
      };

      instance = new HostedFields(configuration);

      for (i = 0; i < instance._bus.on.callCount; i++) {
        if (instance._bus.on.getCall(0).args[0] === events.FRAME_READY) {
          frameReadyHandler = instance._bus.on.getCall(0).args[1];
          break;
        }
      }

      frameReadyHandler(replyStub);
      expect(replyStub).not.to.have.beenCalled;

      frameReadyHandler(replyStub);
      expect(replyStub).not.to.have.beenCalled;

      frameReadyHandler(replyStub);
      expect(replyStub).to.be.calledWith(configuration);
    });

    context('supported card types', function () {
      it('replies with configuration including supportedCardTypes', function () {
        var instance, i, frameReadyHandler;
        var configuration = this.defaultConfiguration;
        var replyStub = this.sandbox.stub();
        var numberNode = document.createElement('div');

        numberNode.id = 'number';

        document.body.appendChild(numberNode);

        configuration.fields = {
          number: {
            rejectUnsupportedCards: true,
            selector: '#number'
          }
        };

        instance = new HostedFields(configuration);

        for (i = 0; i < instance._bus.on.callCount; i++) {
          if (instance._bus.on.getCall(0).args[0] === events.FRAME_READY) {
            frameReadyHandler = instance._bus.on.getCall(0).args[1];
            break;
          }
        }

        frameReadyHandler(replyStub);
        expect(replyStub).not.to.have.beenCalled;

        frameReadyHandler(replyStub);
        expect(replyStub).not.to.have.beenCalled;

        frameReadyHandler(replyStub);
        expect(replyStub).to.be.calledWithMatch({
          supportedCardTypes: [
            'American Express',
            'Discover',
            'Visa'
          ]
        });
      });
    });

    it('converts class name to computed style', function () {
      var instance, i, frameReadyHandler;
      var configuration = this.defaultConfiguration;
      var replyStub = this.sandbox.stub();
      var style = document.createElement('style');
      var numberNode = document.createElement('div');

      style.innerText = '.class-name { color: rgb(0, 0, 255); }';
      numberNode.id = 'number';

      document.body.appendChild(style);
      document.body.appendChild(numberNode);

      configuration.fields = {
        number: {selector: '#number'}
      };

      configuration.styles = {
        input: 'class-name'
      };

      instance = new HostedFields(configuration);

      for (i = 0; i < instance._bus.on.callCount; i++) {
        if (instance._bus.on.getCall(0).args[0] === events.FRAME_READY) {
          frameReadyHandler = instance._bus.on.getCall(0).args[1];
          break;
        }
      }

      frameReadyHandler(replyStub);
      expect(replyStub).not.to.have.beenCalled;

      frameReadyHandler(replyStub);
      expect(replyStub).not.to.have.beenCalled;

      frameReadyHandler(replyStub);
      expect(replyStub).to.be.calledWithMatch({
        styles: {
          input: this.sandbox.match({
            color: 'rgb(0, 0, 255)'
          })
        }
      });
    });

    it('emits "ready" when the final FRAME_READY is emitted', function (done) {
      var instance, i, frameReadyHandler;
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var cvvNode = document.createElement('div');
      var expirationDateNode = document.createElement('div');

      function noop() {}

      numberNode.id = 'number';
      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(numberNode);
      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: {selector: '#number'},
        cvv: {selector: '#cvv'},
        expirationDate: {selector: '#expirationDate'}
      };

      instance = new HostedFields(configuration);

      for (i = 0; i < instance._bus.on.callCount; i++) {
        if (instance._bus.on.getCall(0).args[0] === events.FRAME_READY) {
          frameReadyHandler = instance._bus.on.getCall(0).args[1];
          break;
        }
      }

      instance.on('ready', done);

      frameReadyHandler(noop);
      frameReadyHandler(noop);
      frameReadyHandler(noop);
    });

    it('subscribes to INPUT_EVENT', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._bus.on).to.be.calledWith(events.INPUT_EVENT, this.sandbox.match.func);
    });

    it('calls _setupLabelFocus', function () {
      var instance;
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var cvvNode = document.createElement('div');
      var expirationDateNode = document.createElement('div');

      numberNode.id = 'number';
      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(numberNode);
      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      this.sandbox.stub(HostedFields.prototype, '_setupLabelFocus');

      configuration.fields = {
        number: {selector: '#number'},
        cvv: {selector: '#cvv'},
        expirationDate: {selector: '#expirationDate'}
      };

      instance = new HostedFields(configuration);

      expect(instance._setupLabelFocus.callCount).to.equal(3);
      expect(instance._setupLabelFocus.lastCall.args[0]).to.equal('expirationDate');
      expect(instance._setupLabelFocus.lastCall.args[1]).to.equal(expirationDateNode);
    });

    it('_state.fields is in default configuration on instantiation', function () {
      var instance, fields;
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var cvvNode = document.createElement('div');
      var expirationDateNode = document.createElement('div');

      numberNode.id = 'number';
      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(numberNode);
      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: {selector: '#number'},
        cvv: {selector: '#cvv'},
        expirationDate: {selector: '#expirationDate'}
      };

      instance = new HostedFields(configuration);
      fields = instance.getState().fields;

      expect(fields).to.have.all.keys('number', 'cvv', 'expirationDate');

      Object.keys(fields).forEach(function (key) {
        expect(fields[key]).to.deep.equal({
          isEmpty: true,
          isValid: false,
          isPotentiallyValid: true,
          isFocused: false,
          container: document.querySelector('#' + key)
        });
      });
    });

    it('_state.cards is correct on instantiation', function () {
      var instance = new HostedFields(this.defaultConfiguration);
      var state = instance.getState();

      expect(state.cards).to.deep.equal(getCardTypes(''));
    });
  });

  describe('input event handler', function () {
    beforeEach(function () {
      var configuration = this.defaultConfiguration;

      this.fakeContainer = document.createElement('div');
      this.fakeContainer.id = 'fakenumbercontainer';
      document.body.appendChild(this.fakeContainer);
      configuration.fields.number = {
        selector: '#' + this.fakeContainer.id
      };

      this.instance = new HostedFields(configuration);

      this.sandbox.stub(this.instance, '_emit');

      this.inputEventHandler = this.instance._bus.on.args.reduce(function (result, args) {
        if (args[0] === events.INPUT_EVENT) {
          return args[1];
        }

        return result;
      });

      this.eventData = {
        type: 'foo',
        merchantPayload: {
          emittedBy: 'number',
          cards: [],
          fields: {
            number: {
              isFocused: false,
              isValid: false,
              isPotentiallyValid: true
            }
          }
        }
      };
    });

    afterEach(function () {
      document.body.removeChild(this.fakeContainer);
    });

    it('applies no focused class if the field is not focused', function () {
      this.eventData.merchantPayload.fields.number.isFocused = false;
      this.inputEventHandler(this.eventData);

      expect(this.fakeContainer.className).not.to.contain('braintree-hosted-fields-focused');
    });

    it('applies the focused class if the field is focused', function () {
      this.eventData.merchantPayload.fields.number.isFocused = true;
      this.inputEventHandler(this.eventData);

      expect(this.fakeContainer.className).to.contain('braintree-hosted-fields-focused');
    });

    it('applies no valid class if field is invalid', function () {
      this.eventData.merchantPayload.fields.number.isValid = false;
      this.inputEventHandler(this.eventData);

      expect(this.fakeContainer.className).not.to.contain('braintree-hosted-fields-valid');
    });

    it('applies the valid class if field is valid', function () {
      this.eventData.merchantPayload.fields.number.isValid = true;
      this.inputEventHandler(this.eventData);

      expect(this.fakeContainer.className).to.contain('braintree-hosted-fields-valid');
    });

    it('applies the invalid class if the field is not potentially valid', function () {
      this.eventData.merchantPayload.fields.number.isPotentiallyValid = false;
      this.inputEventHandler(this.eventData);

      expect(this.fakeContainer.className).to.contain('braintree-hosted-fields-invalid');
    });

    it('applies no invalid class if the field is potentially valid', function () {
      this.eventData.merchantPayload.fields.number.isPotentiallyValid = true;
      this.inputEventHandler(this.eventData);

      expect(this.fakeContainer.className).not.to.contain('braintree-hosted-fields-invalid');
    });

    it('sets internal state based on merchant payload', function () {
      this.inputEventHandler(this.eventData);

      expect(this.instance._state.cards).to.equal(this.eventData.merchantPayload.cards);
      expect(this.instance._state.fields).to.equal(this.eventData.merchantPayload.fields);
    });

    it('calls emit with the type and merchant payload', function () {
      this.inputEventHandler(this.eventData);

      expect(this.instance._emit).to.be.calledOnce;
      expect(this.instance._emit).to.be.calledWith('foo', this.eventData.merchantPayload);
    });
  });

  describe('tokenize', function () {
    it('does not require options', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance._bus.emit.yieldsAsync([]);

      instance.tokenize(function (err) {
        expect(err).to.not.exist;
        done();
      });
    });

    it('emits TOKENIZATION_REQUEST with empty options', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance._bus.emit.yieldsAsync([]);
      instance.tokenize(function () {
        expect(instance._bus.emit).to.be.calledWith(events.TOKENIZATION_REQUEST, {}, this.sandbox.match.func);
        done();
      }.bind(this));
    });

    it('emits TOKENIZATION_REQUEST with options', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);
      var options = {foo: 'bar'};

      instance._bus.emit.yieldsAsync([]);
      instance.tokenize(options, function () {
        expect(instance._bus.emit).to.be.calledWith(events.TOKENIZATION_REQUEST, options, this.sandbox.match.func);
        done();
      }.bind(this));
    });

    it('rejects with a Braintree error object', function () {
      var instance = new HostedFields(this.defaultConfiguration);
      var error = {
        name: 'BraintreeError',
        code: 'HOSTED_FIELDS_FIELDS_INVALID',
        message: 'Something',
        type: 'CUSTOMER'
      };

      instance._bus.emit.yieldsAsync([error]);

      return instance.tokenize().then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
      });
    });

    it('rejects with an object of invalid field containers', function () {
      var instance = new HostedFields(this.defaultConfiguration);
      var error = {
        name: 'BraintreeError',
        code: 'HOSTED_FIELDS_FIELDS_INVALID',
        message: 'Something',
        type: 'CUSTOMER',
        details: {
          invalidFieldKeys: ['cvv', 'number']
        }
      };

      instance._fields = {
        cvv: {containerElement: {}},
        number: {containerElement: {}}
      };

      instance._bus.emit.yieldsAsync([error]);

      return instance.tokenize().then(rejectIfResolves).catch(function (err) {
        expect(err.details.invalidFields).to.deep.equal({
          cvv: instance._fields.cvv.containerElement,
          number: instance._fields.number.containerElement
        });
      });
    });

    it('calls the callback when options are not provided', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance._bus.emit.yieldsAsync([null, 'foo']);

      instance.tokenize(function (err, data) {
        expect(data).to.equal('foo');
        done();
      });
    });

    it('calls the callback when options are provided', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance._bus.emit.yieldsAsync([null, 'foo']);

      instance.tokenize({foo: 'bar'}, function (err, data) {
        expect(data).to.equal('foo');
        done();
      });
    });

    it('returns a promise', function () {
      var promise;
      var instance = new HostedFields(this.defaultConfiguration);

      instance._bus.emit.yieldsAsync([null, 'foo']);

      promise = instance.tokenize();

      expect(promise).to.be.an.instanceof(Promise);

      return promise.then(function (data) {
        expect(data).to.equal('foo');
      });
    });
  });

  describe('teardown', function () {
    it('calls destructor\'s teardown', function () {
      var teardownStub = {teardown: function () {}};

      this.sandbox.stub(teardownStub, 'teardown');

      function callback() {}

      HostedFields.prototype.teardown.call({
        _destructor: teardownStub,
        _client: function () {}
      }, callback);

      expect(teardownStub.teardown).to.be.calledWith(this.sandbox.match.func);
    });

    it('calls teardown analytic', function (done) {
      var fakeErr = {};
      var client = this.defaultConfiguration.client;

      HostedFields.prototype.teardown.call({
        _client: client,
        _destructor: {
          teardown: function (callback) {
            callback(fakeErr);
          }
        }
      }, function (err) {
        expect(err).to.equal(fakeErr);
        expect(analytics.sendEvent).to.be.calledWith(client, 'custom.hosted-fields.teardown-completed');

        done();
      });
    });

    it('returns a promise', function () {
      var client = this.defaultConfiguration.client;
      var promise;

      promise = HostedFields.prototype.teardown.call({
        _destructor: {teardown: function () {}},
        _client: client
      });

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.teardown(function () {
        methods(HostedFields.prototype).concat(methods(EventEmitter.prototype))
          .forEach(function (method) {
            var error;

            try {
              instance[method]();
            } catch (err) {
              error = err;
            }

            expect(error).to.be.an.instanceof(BraintreeError);
            expect(error.type).to.equal(BraintreeError.types.MERCHANT);
            expect(error.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
            expect(error.message).to.equal(method + ' cannot be called after teardown.');
          });

        document.body.removeChild(numberNode);

        done();
      });
    });
  });

  describe('addClass', function () {
    beforeEach(function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };

      this.instance = new HostedFields(configuration);
    });

    it('emits ADD_CLASS event', function () {
      this.instance.addClass('number', 'my-class');
      expect(this.instance._bus.emit).to.be.calledWith(events.ADD_CLASS, 'number', 'my-class');
    });

    it('calls callback if provided', function (done) {
      this.instance.addClass('number', 'my-class', done);
    });

    it('calls errback when given non-allowed field', function (done) {
      this.instance.addClass('rogue-field', 'my-class', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when adding a class.');
        expect(err.details).not.to.exist;
        expect(this.instance._bus.emit).to.not.be.calledWith(events.ADD_CLASS);
        done();
      }.bind(this));
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      this.instance.addClass('cvv', 'my-class', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot add class to "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(this.instance._bus.emit).to.not.be.calledWith(events.ADD_CLASS);
        done();
      }.bind(this));
    });
  });

  describe('removeClass', function () {
    beforeEach(function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };

      this.instance = new HostedFields(configuration);
    });

    it('emits REMOVE_CLASS event', function () {
      this.instance.removeClass('number', 'my-class');
      expect(this.instance._bus.emit).to.be.calledWith(events.REMOVE_CLASS, 'number', 'my-class');
    });

    it('calls callback if provided', function (done) {
      this.instance.removeClass('number', 'my-class', done);
    });

    it('calls errback when given non-allowed field', function (done) {
      this.instance.removeClass('rogue-field', 'my-class', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when removing a class.');
        expect(err.details).not.to.exist;
        expect(this.instance._bus.emit).to.not.be.calledWith(events.REMOVE_CLASS);
        done();
      }.bind(this));
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      this.instance.removeClass('cvv', 'my-class', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot remove class from "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(this.instance._bus.emit).to.not.be.calledWith(events.REMOVE_CLASS);
        done();
      }.bind(this));
    });
  });

  describe('setAttribute', function () {
    it('emits SET_ATTRIBUTE event if options are valid', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.setAttribute({
        field: 'number',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      });

      expect(instance._bus.emit).to.be.calledWith(events.SET_ATTRIBUTE, 'number', 'placeholder', '1111 1111 1111 1111');
    });

    it('calls callback if provided', function (done) {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.setAttribute({
        field: 'number',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      }, done);
    });

    it('calls errback when given non-allowed field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setAttribute({
        field: 'rogue-field',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      }, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when setting an attribute.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('does not emit SET_ATTRIBUTE event when given non-allowed field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setAttribute({
        field: 'rogue-field',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      }, function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setAttribute({
        field: 'cvv',
        attribute: 'placeholder',
        value: '123'
      }, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot set attribute for "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('does not emit SET_ATTRIBUTE event when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setAttribute({
        field: 'cvv',
        attribute: 'placeholder',
        value: '123'
      }, function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });
  });

  describe('setMessage', function () {
    it('emits SET_MESSAGE event if options are valid', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.setMessage({
        field: 'number',
        message: 'This is a test message'
      });

      expect(instance._bus.emit).to.be.calledWith(events.SET_MESSAGE, 'number', 'This is a test message');
    });
  });

  describe('removeAttribute', function () {
    it('emits REMOVE_ATTRIBUTE event if options are valid', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.removeAttribute({
        field: 'number',
        attribute: 'disabled'
      });

      expect(instance._bus.emit).to.be.calledWith(events.REMOVE_ATTRIBUTE, 'number', 'disabled');
    });

    it('calls callback if provided', function (done) {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.removeAttribute({
        field: 'number',
        attribute: 'disabled'
      }, done);
    });

    it('calls errback when given non-allowed field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.removeAttribute({
        field: 'rogue-field',
        attribute: 'disabled'
      }, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when removing an attribute.');
        expect(err.details).not.to.exist;
        done();
      });
    });

    it('does not emit REMOVE_ATTRIBUTE event when given non-allowed field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.removeAttribute({
        field: 'rogue-field',
        attribute: 'disabled'
      }, function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.REMOVE_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.removeAttribute({
        field: 'cvv',
        attribute: 'disabled'
      }, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot remove attribute for "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        done();
      });
    });

    it('does not emit REMOVE_ATTRIBUTE event when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.removeAttribute({
        field: 'cvv',
        attribute: 'disabled'
      }, function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.REMOVE_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('calls errback when given non-allowed attribute', function (done) {
      var instance;
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');

      numberNode.id = 'number';
      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.removeAttribute({
        field: 'number',
        attribute: 'illegal'
      }, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED');
        expect(err.message).to.equal('The "illegal" attribute is not supported in Hosted Fields.');
        expect(err.details).not.to.exist;
        done();
      });
    });

    it('does not emit REMOVE_ATTRIBUTE event when given non-allowed attribute', function (done) {
      var instance;
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');

      numberNode.id = 'number';
      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.removeAttribute({
        field: 'number',
        attribute: 'illegal'
      }, function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.REMOVE_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });
  });

  describe('setPlaceholder', function () {
    it('calls setAttribute', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);
      this.sandbox.stub(HostedFields.prototype, 'setAttribute');

      instance.setPlaceholder('number', 'great-placeholder');
      expect(instance.setAttribute).to.be.calledWith({field: 'number', attribute: 'placeholder', value: 'great-placeholder'});
    });

    it('calls callback if provided', function (done) {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.setPlaceholder('number', 'great-placeholder', done);
    });

    it('calls errback when given non-allowed field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setPlaceholder('rogue-field', 'rogue-placeholder', function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when setting an attribute.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('does not emit SET_ATTRIBUTE event when given non-allowed field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setPlaceholder('rogue-field', 'rogue-placeholder', function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setPlaceholder('cvv', 'great-placeholder', function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot set attribute for "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });

    it('does not emit SET_ATTRIBUTE event when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setPlaceholder('cvv', 'great-placeholder', function () {
        expect(instance._bus.emit).to.not.be.calledWith(
          events.SET_ATTRIBUTE,
          this.sandbox.match.string,
          this.sandbox.match.string,
          this.sandbox.match.string
        );
        done();
      }.bind(this));
    });
  });

  describe('clear', function () {
    it('emits CLEAR_FIELD event', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.clear('number');
      expect(instance._bus.emit).to.be.calledWith(events.CLEAR_FIELD, this.sandbox.match.string);
    });

    it('calls callback if provided', function (done) {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.clear('number', done);
    });

    it('calls errback when given non-allowed field', function (done) {
      var self = this;
      var instance = new HostedFields(this.defaultConfiguration);

      instance.clear('rogue-field', function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when clearing a field.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.CLEAR_FIELD, self.sandbox.match.string);
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var self = this;
      var instance = new HostedFields(this.defaultConfiguration);

      instance.clear('cvv', function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot clear "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.CLEAR_FIELD, self.sandbox.match.string);
        done();
      });
    });
  });

  describe('focus', function () {
    it('emits TRIGGER_INPUT_FOCUS event', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.focus('number');
      expect(instance._bus.emit).to.be.calledWith(events.TRIGGER_INPUT_FOCUS, this.sandbox.match.string);
    });

    it('calls callback if provided', function (done) {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.focus('number', done);
    });

    it('calls errback when given non-allowed field', function (done) {
      var self = this;
      var instance = new HostedFields(this.defaultConfiguration);

      instance.focus('rogue-field', function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when focusing a field.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.TRIGGER_INPUT_FOCUS, self.sandbox.match.string);
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var self = this;
      var instance = new HostedFields(this.defaultConfiguration);

      instance.focus('cvv', function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).to.equal('Cannot focus "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.TRIGGER_INPUT_FOCUS, self.sandbox.match.string);
        done();
      });
    });
  });

  describe('getState', function () {
    it('returns the field state', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      instance._state = 'field state';
      expect(instance.getState()).to.equal('field state');
    });
  });
});
