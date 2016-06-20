'use strict';

var Bus = require('../../../../src/lib/bus');
var HostedFields = require('../../../../src/hosted-fields/external/hosted-fields');
var events = require('../../../../src/hosted-fields/shared/constants').events;
var Destructor = require('../../../../src/lib/destructor');
var EventEmitter = require('../../../../src/lib/event-emitter');
var BraintreeError = require('../../../../src/lib/error');
var fake = require('../../../helpers/fake');
var analytics = require('../../../../src/lib/analytics');
var methods = require('../../../../src/lib/methods');
var version = require('../../../../package.json').version;

describe('HostedFields', function () {
  beforeEach(function () {
    this.defaultConfiguration = {
      client: {
        getConfiguration: fake.configuration,
        _request: function () {}
      },
      fields: {}
    };
  });

  describe('Constructor', function () {
    it('inherits from EventEmitter', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance).to.be.an.instanceOf(EventEmitter);
    });

    it('creates a Destructor instance', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._destructor).to.be.an.instanceOf(Destructor);
    });

    it('creates a bus instance', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._bus).to.be.an.instanceOf(Bus);
    });

    it('sends an analytics event', function () {
      var client = this.defaultConfiguration.client;

      this.sandbox.stub(analytics, 'sendEvent');

      new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new

      expect(analytics.sendEvent).to.have.been.calledWith(client, 'web.custom.hosted-fields.initialized');
    });

    it('sends a timeout event if the fields take too long to set up', function () {
      var client = this.defaultConfiguration.client;
      var clock = this.sandbox.useFakeTimers();

      this.sandbox.stub(analytics, 'sendEvent');

      new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new

      clock.tick(59999);
      expect(analytics.sendEvent).not.to.have.been.calledWith(client, 'web.custom.hosted-fields.load.timed-out');

      clock.tick(1);
      expect(analytics.sendEvent).to.have.been.calledWith(client, 'web.custom.hosted-fields.load.timed-out');
    });

    describe('configuration validation', function () {
      it('throws an error if client is not passed in', function () {
        var err;

        try {
          new HostedFields({fields: {}});  // eslint-disable-line no-new
        } catch (e) {
          err = e;
        }

        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('You must specify a client when initializing Hosted Fields.');
        expect(err.details).not.to.exist;
      });

      it('throws an error if client version does not match', function () {
        var err;

        this.defaultConfiguration.client.getConfiguration = function () {
          var config = fake.configuration();

          config.analyticsMetadata.sdkVersion = '1.2.3';
          return config;
        };

        try {
          new HostedFields(this.defaultConfiguration);  // eslint-disable-line no-new
        } catch (e) {
          err = e;
        }

        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('Client (version 1.2.3) and Hosted Fields (version ' + version + ') components must be from the same SDK version.');
        expect(err.details).not.to.exist;
      });

      it('throws an error if fields is not passed in', function () {
        var configuration = this.defaultConfiguration;

        delete configuration.fields;

        try {
          new HostedFields(configuration);  // eslint-disable-line no-new
          throw new Error('we should never reach this point');
        } catch (err) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.message).to.equal('You must specify fields when initializing Hosted Fields.');
          expect(err.details).not.to.exist;
        }
      });

      it('throws an error if field container does not exist', function () {
        var configuration = this.defaultConfiguration;

        configuration.fields.number = {
          selector: '#foo'
        };

        try {
          new HostedFields(configuration);  // eslint-disable-line no-new
          throw new Error('we should never reach this point');
        } catch (err) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.message).to.equal('Selector does not reference a valid DOM node.');
          expect(err.details).to.deep.equal({
            fieldSelector: '#foo',
            fieldKey: 'number'
          });
        }
      });

      it('throws an error if field container already contains a braintree iframe', function () {
        var container = document.createElement('div');
        var iframe = document.createElement('iframe');
        var configuration = this.defaultConfiguration;

        configuration.fields.number = {
          selector: '#foo'
        };

        container.id = 'foo';
        iframe.name = 'braintree-anything';

        container.appendChild(iframe);
        document.body.appendChild(container);

        try {
          new HostedFields(configuration);  // eslint-disable-line no-new
          throw new Error('we should never reach this point');
        } catch (err) {
          expect(err).to.be.an.instanceOf(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.message).to.equal('Element already contains a Braintree iframe.');
          expect(err.details).to.deep.equal({
            fieldSelector: '#foo',
            fieldKey: 'number'
          });
        }

        document.body.removeChild(container);
      });
    });

    it('subscribes to FRAME_READY', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      expect(instance._bus.on).to.be.calledWith(events.FRAME_READY, sinon.match.func);
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
      expect(replyStub).to.have.been.calledWith(configuration);
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

      expect(instance._bus.on).to.be.calledWith(events.INPUT_EVENT, sinon.match.func);
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
  });

  describe('tokenize', function () {
    it('emits TOKENIZATION_REQUEST', function () {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.tokenize(this.sandbox.stub());
      expect(instance._bus.emit).to.be.calledWith(events.TOKENIZATION_REQUEST, sinon.match.func);
    });

    it('calls the callback', function () {
      var instance = new HostedFields(this.defaultConfiguration);
      var callback = this.sandbox.stub();

      instance._bus.emit.yields(['foo']);

      instance.tokenize(callback);

      expect(callback).to.have.been.calledWith('foo');
    });

    it('requires a callback', function () {
      var err;
      var instance = new HostedFields(this.defaultConfiguration);

      instance._bus.emit.yields(['foo']);

      try {
        instance.tokenize();
      } catch (e) {
        err = e;
      }

      expect(err).to.be.an.instanceOf(BraintreeError);
      expect(err.type).to.equal('MERCHANT');
      expect(err.message).to.equal('tokenize must include a callback function.');
    });
  });

  describe('teardown', function () {
    it('calls destructor\'s teardown', function () {
      var teardownStub = {teardown: function () {}};

      this.sandbox.stub(teardownStub, 'teardown');
      this.sandbox.stub(analytics, 'sendEvent');

      function callback() {}

      HostedFields.prototype.teardown.call({
        _destructor: teardownStub,
        _client: function () {}
      }, callback);

      expect(teardownStub.teardown).to.have.been.calledWith(this.sandbox.match.func);
    });

    it('calls teardown analytic', function (done) {
      var fakeErr = {};
      var client = this.defaultConfiguration.client;

      this.sandbox.stub(analytics, 'sendEvent');

      HostedFields.prototype.teardown.call({
        _client: client,
        _destructor: {
          teardown: function (callback) {
            callback(fakeErr);
          }
        }
      }, function (err) {
        expect(err).to.equal(fakeErr);
        expect(analytics.sendEvent).to.have.been.calledWith(client, 'web.custom.hosted-fields.teardown-completed');

        done();
      });
    });

    it('does not require a callback', function () {
      var client = this.defaultConfiguration.client;

      this.sandbox.stub(analytics, 'sendEvent');

      expect(function () {
        HostedFields.prototype.teardown.call({
          _destructor: {teardown: function () {}},
          _client: client
        });
      }).to.not.throw();
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
          expect(instance[method]).to.throw(BraintreeError, method + ' cannot be called after teardown');
        });

        document.body.removeChild(numberNode);

        done();
      });
    });
  });

  describe('setPlaceholder', function () {
    it('emits SET_PLACEHOLDER event', function () {
      var configuration = this.defaultConfiguration;
      var numberNode = document.createElement('div');
      var instance;

      numberNode.id = 'number';

      document.body.appendChild(numberNode);
      configuration.fields.number = {
        selector: '#number'
      };
      instance = new HostedFields(configuration);

      instance.setPlaceholder('number', 'great-placeholder');
      expect(instance._bus.emit).to.be.calledWith(events.SET_PLACEHOLDER, sinon.match.string, sinon.match.string);
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

    it('calls errback when given non-whitelisted field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setPlaceholder('rogue-field', 'rogue-placeholder', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when setting a placeholder.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.SET_PLACEHOLDER, sinon.match.string, sinon.match.string);
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.setPlaceholder('cvv', 'great-placeholder', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('Cannot set placeholder for "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.SET_PLACEHOLDER, sinon.match.string, sinon.match.string);
        done();
      });
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
      expect(instance._bus.emit).to.be.calledWith(events.CLEAR_FIELD, sinon.match.string);
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

    it('calls errback when given non-whitelisted field', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.clear('rogue-field', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('"rogue-field" is not a valid field. You must use a valid field option when clearing a field.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.CLEAR_FIELD, sinon.match.string);
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', function (done) {
      var instance = new HostedFields(this.defaultConfiguration);

      instance.clear('cvv', function (err) {
        expect(err).to.be.an.instanceOf(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.message).to.equal('Cannot clear "cvv" field because it is not part of the current Hosted Fields options.');
        expect(err.details).not.to.exist;
        expect(instance._bus.emit).to.not.be.calledWith(events.CLEAR_FIELD, sinon.match.string);
        done();
      });
    });
  });
});
