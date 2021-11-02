'use strict';

jest.mock('../../../../src/hosted-fields/shared/browser-detection');
jest.mock('../../../../src/hosted-fields/external/get-styles-from-class');

const analytics = require('../../../../src/lib/analytics');
const Bus = require('framebus');
const createDeferredClient = require('../../../../src/lib/create-deferred-client');
const Client = require('../../../../src/client/client');
const HostedFields = require('../../../../src/hosted-fields/external/hosted-fields');
const getStylesFromClass = require('../../../../src/hosted-fields/external/get-styles-from-class');
const { events } = require('../../../../src/hosted-fields/shared/constants');
const Destructor = require('../../../../src/lib/destructor');
const shadow = require('../../../../src/lib/shadow');
const EventEmitter = require('@braintree/event-emitter');
const BraintreeError = require('../../../../src/lib/braintree-error');
const { fake, noop, rejectIfResolves, findFirstEventCallback, yieldsAsync, yieldsByEvent } = require('../../../helpers');
const methods = require('../../../../src/lib/methods');
const getCardTypes = require('../../../../src/hosted-fields/shared/get-card-types');
const browserDetection = require('../../../../src/hosted-fields/shared/browser-detection');

describe('HostedFields', () => {
  let testContext;

  beforeEach(() => {
    const fakeClient = fake.client();

    testContext = {
      fakeClient,
      numberDiv: document.createElement('div'),
      defaultConfiguration: {
        client: fakeClient,
        fields: {
          number: {
            container: '#number'
          }
        }
      }
    };

    testContext.defaultConfiguration.client._request = noop;
    testContext.numberDiv.setAttribute('id', 'number');

    document.body.appendChild(testContext.numberDiv);

    jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.fakeClient);
  });

  afterEach(() => {
    document.body.removeChild(testContext.numberDiv);
    if (testContext.instance) {
      testContext.instance.teardown();
    }
    testContext = null;
    document.body.innerHTML = null;
    Client.clearCache();
    delete window.braintree;
  });

  describe('Constructor', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('inherits from EventEmitter', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance).toBeInstanceOf(EventEmitter);
    });

    it('creates a Destructor instance', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance._destructor).toBeInstanceOf(Destructor);
    });

    it('creates a bus instance', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance._bus).toBeInstanceOf(Bus);
    });

    it('sends an analytics event', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.instance._clientPromise, 'custom.hosted-fields.initialized');
    });

    it('appends `deferred-client` to initialized analytics event if client is deferred', () => {
      delete testContext.defaultConfiguration.client;
      testContext.defaultConfiguration.authorization = 'auth';

      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.instance._clientPromise, 'custom.hosted-fields.initialized.deferred-client');
    });

    it('errors if no fields are provided', () => {
      let error;

      delete testContext.defaultConfiguration.fields;

      try {
        new HostedFields(testContext.defaultConfiguration);  // eslint-disable-line no-new
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(BraintreeError);
      expect(error.code).toBe('INSTANTIATION_OPTION_REQUIRED');
    });

    it('errors if no fields keys are provided', () => {
      let error;

      testContext.defaultConfiguration.fields = {};

      try {
        new HostedFields(testContext.defaultConfiguration);  // eslint-disable-line no-new
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(BraintreeError);
      expect(error.code).toBe('INSTANTIATION_OPTION_REQUIRED');
    });

    it('sends a timeout event if the fields take too long to set up', () => {
      jest.useFakeTimers();

      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      jest.advanceTimersByTime(59999);
      expect(analytics.sendEvent).not.toHaveBeenCalledWith(testContext.instance._clientPromise, 'custom.hosted-fields.load.timed-out');

      jest.advanceTimersByTime(1);
      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.instance._clientPromise, 'custom.hosted-fields.load.timed-out');
    });

    it('emits a timeout event if the fields take too long to set up', () => {
      jest.useFakeTimers();

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      jest.spyOn(testContext.instance, '_emit').mockImplementation();

      jest.advanceTimersByTime(59999);
      expect(testContext.instance._emit).not.toHaveBeenCalledWith('timeout');

      jest.advanceTimersByTime(1);
      expect(testContext.instance._emit).toHaveBeenCalledWith('timeout');
    });

    it('subscribes to FRAME_READY', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance._bus.on).toHaveBeenCalledWith(events.FRAME_READY, expect.any(Function));
    });

    it('replies with configuration, only to the final FRAME_READY', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { selector: '#number' },
        cvv: { selector: '#cvv' },
        expirationDate: { selector: '#expirationDate' }
      };
      configuration.orderedFields = ['number', 'cvv', 'expirationDate'];

      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        expect(replyStub).toHaveBeenCalledWith(configuration);

        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
      frameReadyHandler({ field: 'cvv' }, replyStub);
      frameReadyHandler({ field: 'expirationDate' }, replyStub);
    });

    it('replies with configuration without container param in fields', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number', placeholder: '4111' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };
      configuration.orderedFields = ['number', 'cvv', 'expirationDate'];

      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        expect(replyStub).toHaveBeenCalledWith(expect.objectContaining({
          fields: {
            number: { placeholder: '4111' },
            cvv: {},
            expirationDate: {}
          }
        }));

        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
      frameReadyHandler({ field: 'cvv' }, replyStub);
      frameReadyHandler({ field: 'expirationDate' }, replyStub);
    });

    it('creates an iframe for each field', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number', placeholder: '4111' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };
      configuration.orderedFields = ['number', 'cvv', 'expirationDate'];

      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        const iframes = document.querySelectorAll('iframe');

        expect(iframes.length).toBe(3);
        expect(iframes[0].getAttribute('title')).toBe('Secure Credit Card Frame - Credit Card Number');
        expect(iframes[1].getAttribute('title')).toBe('Secure Credit Card Frame - CVV');
        expect(iframes[2].getAttribute('title')).toBe('Secure Credit Card Frame - Expiration Date');

        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
      frameReadyHandler({ field: 'cvv' }, replyStub);
      frameReadyHandler({ field: 'expirationDate' }, replyStub);
    });

    it('can pass custom titles for iframes', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number', iframeTitle: 'Number' },
        cvv: { container: '#cvv', iframeTitle: 'CVV' },
        expirationDate: { container: '#expirationDate', iframeTitle: 'Expiration Date' }
      };
      configuration.orderedFields = ['number', 'cvv', 'expirationDate'];

      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        const iframes = document.querySelectorAll('iframe');

        expect(iframes.length).toBe(3);
        expect(iframes[0].getAttribute('title')).toBe('Number');
        expect(iframes[1].getAttribute('title')).toBe('CVV');
        expect(iframes[2].getAttribute('title')).toBe('Expiration Date');

        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
      frameReadyHandler({ field: 'cvv' }, replyStub);
      frameReadyHandler({ field: 'expirationDate' }, replyStub);
    });

    it('can pass DOM node directly as container', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const cvvNode = document.createElement('div');
      const numberNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';
      numberNode.id = 'number';

      document.body.appendChild(cvvNode);
      document.body.appendChild(numberNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: numberNode },
        cvv: { container: cvvNode },
        expirationDate: { container: expirationDateNode }
      };

      testContext.instance = new HostedFields(configuration);
      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
      frameReadyHandler({ field: 'cvv' }, replyStub);
      frameReadyHandler({ field: 'expirationDate' }, replyStub);
    });

    it('can pass shadow DOM node directly as container', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const numberNodeContainer = document.createElement('div');
      const wrapper = document.createElement('div');
      const numberNode = document.createElement('div');
      const shadowDom = numberNodeContainer.attachShadow({ mode: 'open' });

      numberNode.id = 'number';
      shadowDom.appendChild(wrapper);
      wrapper.appendChild(numberNode);

      document.body.appendChild(numberNodeContainer);
      // we have to fake this because jest doesn't recognize
      // the style sheet property on style nodes within
      // the shadow DOM
      jest.spyOn(shadow, 'transformToSlot')
        .mockReturnValue(document.createElement('div'));

      configuration.fields = {
        number: { container: numberNode }
      };

      testContext.instance = new HostedFields(configuration);
      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        expect(shadow.transformToSlot).toBeCalledTimes(1);
        expect(shadow.transformToSlot).toBeCalledWith(numberNode, 'height: 100%');
        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
    });

    it('must pass a DOM node of type 1', () => {
      let error;
      const configuration = testContext.defaultConfiguration;
      const numberNode = document.createDocumentFragment();

      document.body.appendChild(numberNode);

      configuration.fields = {
        number: { container: numberNode }
      };

      try {
        testContext.instance = new HostedFields(configuration);
      } catch (e) {
        error = e;
      }

      expect(testContext.instance).toBeFalsy();
      expect(error).toBeInstanceOf(BraintreeError);
      expect(error.code).toBe('HOSTED_FIELDS_INVALID_FIELD_SELECTOR');
    });

    it('subscribes to CARD_FORM_ENTRY_HAS_BEGUN', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance._bus.on).toHaveBeenCalledWith(events.CARD_FORM_ENTRY_HAS_BEGUN, expect.any(Function));
    });

    it('sends analytic event for tokenization starting when CARD_FORM_ENTRY_HAS_BEGUN event fires', () => {
      jest.spyOn(Bus.prototype, 'on').mockImplementation(yieldsByEvent(events.CARD_FORM_ENTRY_HAS_BEGUN));

      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.instance._clientPromise, 'hosted-fields.input.started');
    });

    it('subscribes to BIN_AVAILABLE', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance._bus.on).toHaveBeenCalledWith(events.BIN_AVAILABLE, expect.any(Function));
    });

    it('sends analytic event for tokenization starting when BIN_AVAILABLE event fires', () => {
      let handler;

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      handler = findFirstEventCallback(events.BIN_AVAILABLE, testContext.instance._bus.on.mock.calls);

      jest.spyOn(testContext.instance, '_emit');

      handler('123456');

      expect(testContext.instance._emit).toHaveBeenCalledWith('binAvailable', {
        bin: '123456'
      });
    });

    it('can pass selector instead of container for field', () => {
      let error;

      testContext.defaultConfiguration.fields.number.selector = testContext.defaultConfiguration.fields.number.container;
      delete testContext.defaultConfiguration.fields.number.container;

      try {
        new HostedFields(testContext.defaultConfiguration);  // eslint-disable-line no-new
      } catch (e) {
        error = e;
      }

      expect(error).toBeUndefined();
    });

    it('converts class name to computed style', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const replyStub = jest.fn();
      const style = document.createElement('style');

      style.innerText = '.class-name { color: rgb(0, 0, 255); }';

      document.body.appendChild(style);

      configuration.styles = {
        input: 'class-name'
      };

      testContext.instance = new HostedFields(configuration);
      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        expect(getStylesFromClass).toHaveBeenCalledWith('class-name');

        done();
      });

      frameReadyHandler({ field: 'number' }, replyStub);
    });

    it('emits "ready" when the final FRAME_READY is emitted', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };
      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', done);

      frameReadyHandler({ field: 'number' }, noop);
      frameReadyHandler({ field: 'cvv' }, noop);
      frameReadyHandler({ field: 'expirationDate' }, noop);
    });

    it('subscribes to INPUT_EVENT', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      expect(testContext.instance._bus.on).toHaveBeenCalledWith(events.INPUT_EVENT, expect.any(Function));
    });

    it('calls _setupLabelFocus', () => {
      let setupCalls;
      const configuration = testContext.defaultConfiguration;
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      jest.spyOn(HostedFields.prototype, '_setupLabelFocus');

      configuration.fields = {
        number: { container: '#number' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };
      testContext.instance = new HostedFields(configuration);
      setupCalls = testContext.instance._setupLabelFocus.mock.calls.length;

      expect(setupCalls).toBe(3);
      expect(testContext.instance._setupLabelFocus.mock.calls[setupCalls - 1][0]).toBe('expirationDate');
      expect(testContext.instance._setupLabelFocus.mock.calls[setupCalls - 1][1]).toBe(expirationDateNode);
    });

    it('_state.fields is in default configuration on instantiation', () => {
      let fields;
      const configuration = testContext.defaultConfiguration;
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };

      testContext.instance = new HostedFields(configuration);
      fields = testContext.instance.getState().fields;

      expect(Object.keys(fields)).toEqual(expect.arrayContaining(['number', 'cvv', 'expirationDate']));

      Object.keys(fields).forEach(key => {
        expect(fields[key]).toEqual({
          isEmpty: true,
          isValid: false,
          isPotentiallyValid: true,
          isFocused: false,
          container: document.querySelector(`#${key}`)
        });
      });
    });

    it('_state.cards is correct on instantiation', () => {
      let state;

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      state = testContext.instance.getState();

      expect(state.cards).toEqual(getCardTypes(''));
    });

    it('loads deferred when using an authorization instead of a client', done => {
      let frameReadyHandler;
      const configuration = testContext.defaultConfiguration;
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };

      delete configuration.client;
      configuration.authorization = fake.clientToken;
      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toHaveBeenCalledWith({
          name: 'Hosted Fields',
          client: expect.toBeUndefined,
          authorization: configuration.authorization,
          debug: false,
          assetsUrl: 'https://example.com/assets'
        });

        done();
      });

      frameReadyHandler({ field: 'number' }, noop);
      frameReadyHandler({ field: 'cvv' }, noop);
      frameReadyHandler({ field: 'expirationDate' }, noop);
    });

    it('sends client to orchestrator frame when it requests the client', done => {
      let frameReadyHandler, clientReadyHandler;
      const fakeClient = testContext.fakeClient;
      const configuration = testContext.defaultConfiguration;
      const cvvNode = document.createElement('div');
      const expirationDateNode = document.createElement('div');

      cvvNode.id = 'cvv';
      expirationDateNode.id = 'expirationDate';

      document.body.appendChild(cvvNode);
      document.body.appendChild(expirationDateNode);

      configuration.fields = {
        number: { container: '#number' },
        cvv: { container: '#cvv' },
        expirationDate: { container: '#expirationDate' }
      };

      delete configuration.client;
      configuration.authorization = fake.clientToken;
      testContext.instance = new HostedFields(configuration);

      frameReadyHandler = findFirstEventCallback(events.FRAME_READY, testContext.instance._bus.on.mock.calls);
      clientReadyHandler = findFirstEventCallback(events.READY_FOR_CLIENT, testContext.instance._bus.on.mock.calls);

      testContext.instance.on('ready', () => {
        clientReadyHandler(client => {
          expect(client).toBe(fakeClient);

          done();
        });
      });

      frameReadyHandler({ field: 'number' }, noop);
      frameReadyHandler({ field: 'cvv' }, noop);
      frameReadyHandler({ field: 'expirationDate' }, noop);
    });
  });

  describe('input event handler', () => {
    beforeEach(() => {
      const configuration = testContext.defaultConfiguration;

      testContext.fakeContainer = document.createElement('div');
      testContext.fakeContainer.id = 'fakenumbercontainer';
      document.body.appendChild(testContext.fakeContainer);
      configuration.fields.number = {
        container: `#${testContext.fakeContainer.id}`
      };

      testContext.instance = new HostedFields(configuration);
      jest.spyOn(testContext.instance, '_emit').mockImplementation();

      testContext.inputEventHandler = findFirstEventCallback(events.INPUT_EVENT, testContext.instance._bus.on.mock.calls);
      testContext.eventData = {
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

    afterEach(() => {
      document.body.removeChild(testContext.fakeContainer);
    });

    it('applies no focused class if the field is not focused', () => {
      testContext.eventData.merchantPayload.fields.number.isFocused = false;
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.fakeContainer.className).toEqual(expect.not.stringMatching('braintree-hosted-fields-focused'));
    });

    it('applies the focused class if the field is focused', () => {
      testContext.eventData.merchantPayload.fields.number.isFocused = true;
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.fakeContainer.className).toEqual(expect.stringMatching('braintree-hosted-fields-focused'));
    });

    it('applies no valid class if field is invalid', () => {
      testContext.eventData.merchantPayload.fields.number.isValid = false;
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.fakeContainer.className).toEqual(expect.not.stringMatching('braintree-hosted-fields-valid'));
    });

    it('applies the valid class if field is valid', () => {
      testContext.eventData.merchantPayload.fields.number.isValid = true;
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.fakeContainer.className).toEqual(expect.stringMatching('braintree-hosted-fields-valid'));
    });

    it('applies the invalid class if the field is not potentially valid', () => {
      testContext.eventData.merchantPayload.fields.number.isPotentiallyValid = false;
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.fakeContainer.className).toEqual(expect.stringMatching('braintree-hosted-fields-invalid'));
    });

    it('applies no invalid class if the field is potentially valid', () => {
      testContext.eventData.merchantPayload.fields.number.isPotentiallyValid = true;
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.fakeContainer.className).toEqual(expect.not.stringMatching('braintree-hosted-fields-invalid'));
    });

    it('sets internal state based on merchant payload', () => {
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.instance._state.cards).toBe(testContext.eventData.merchantPayload.cards);
      expect(testContext.instance._state.fields).toBe(testContext.eventData.merchantPayload.fields);
    });

    it('calls emit with the type and merchant payload', () => {
      testContext.inputEventHandler(testContext.eventData);

      expect(testContext.instance._emit).toHaveBeenCalledTimes(1);
      expect(testContext.instance._emit).toHaveBeenCalledWith('foo', testContext.eventData.merchantPayload);
    });
  });

  describe('tokenize', () => {
    it('does not require options', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([]));

      expect.hasAssertions();
      testContext.instance.tokenize(err => {
        expect(err).toBeFalsy();
        done();
      });
    });

    it('emits TOKENIZATION_REQUEST with empty options', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([]));

      expect.assertions(1);
      testContext.instance.tokenize(() => {
        expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.TOKENIZATION_REQUEST, {}, expect.any(Function));
        done();
      });
    });

    it('emits TOKENIZATION_REQUEST with options', done => {
      const options = { foo: 'bar' };

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([]));

      expect.assertions(1);
      testContext.instance.tokenize(options, () => {
        expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.TOKENIZATION_REQUEST, options, expect.any(Function));
        done();
      });
    });

    it('rejects with a Braintree error object', () => {
      const error = {
        name: 'BraintreeError',
        code: 'HOSTED_FIELDS_FIELDS_INVALID',
        message: 'Something',
        type: 'CUSTOMER'
      };

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([error]));

      return testContext.instance.tokenize().then(rejectIfResolves).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
      });
    });

    it('rejects with an object of invalid field containers', () => {
      const error = {
        name: 'BraintreeError',
        code: 'HOSTED_FIELDS_FIELDS_INVALID',
        message: 'Something',
        type: 'CUSTOMER',
        details: {
          invalidFieldKeys: ['cvv', 'number']
        }
      };

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      testContext.instance._fields = {
        cvv: { containerElement: {}},
        number: { containerElement: {}}
      };
      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([error]));

      return testContext.instance.tokenize().then(rejectIfResolves).catch(err => {
        expect(err.details.invalidFields).toEqual({
          cvv: testContext.instance._fields.cvv.containerElement,
          number: testContext.instance._fields.number.containerElement
        });
      });
    });

    it('calls the callback when options are not provided', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([null, 'foo']));

      testContext.instance.tokenize((err, data) => {
        expect(data).toBe('foo');
        done();
      });
    });

    it('calls the callback when options are provided', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([null, 'foo']));

      testContext.instance.tokenize({ foo: 'bar' }, (err, data) => {
        expect(data).toBe('foo');
        done();
      });
    });

    it('returns a promise', () => {
      let promise;

      testContext.instance = new HostedFields(testContext.defaultConfiguration);
      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync([null, 'foo']));

      promise = testContext.instance.tokenize();

      expect(promise).toBeInstanceOf(Promise);

      return promise.then(data => {
        expect(data).toBe('foo');
      });
    });
  });

  describe('teardown', () => {
    it('calls destructor\'s teardown', () => {
      const teardownStub = {
        teardown: jest.fn()
      };

      HostedFields.prototype.teardown.call({
        _destructor: teardownStub,
        _clientPromise: noop
      }, noop);

      expect(teardownStub.teardown).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls teardown analytic', done => {
      const fakeErr = {};
      const client = testContext.defaultConfiguration.client;

      HostedFields.prototype.teardown.call({
        _clientPromise: client,
        _destructor: {
          teardown(callback) {
            callback(fakeErr);
          }
        }
      }, err => {
        expect(err).toBe(fakeErr);
        expect(analytics.sendEvent).toHaveBeenCalledWith(client, 'custom.hosted-fields.teardown-completed');

        done();
      });
    });

    it('returns a promise', () => {
      const client = testContext.defaultConfiguration.client;
      let promise;

      promise = HostedFields.prototype.teardown.call({
        _destructor: {
          teardown() {
          }
        },
        _clientPromise: client
      });

      expect(promise).toBeInstanceOf(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.teardown(() => {
        methods(HostedFields.prototype).concat(methods(EventEmitter.prototype))
          .forEach(method => {
            let error;

            try {
              testContext.instance[method]();
            } catch (err) {
              error = err;
            }

            expect(error).toBeInstanceOf(BraintreeError);
            expect(error).toMatchObject({
              type: BraintreeError.types.MERCHANT,
              code: 'METHOD_CALLED_AFTER_TEARDOWN',
              message: `${method} cannot be called after teardown.`
            });
          });

        delete testContext.instance;
        done();
      });
    });
  });

  describe('addClass', () => {
    beforeEach(() => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);
    });

    it('emits ADD_CLASS event', () => {
      testContext.instance.addClass('number', 'my-class');

      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.ADD_CLASS, {
        field: 'number',
        classname: 'my-class'
      });
    });

    it('calls callback if provided', done => {
      testContext.instance.addClass('number', 'my-class', done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance.addClass('rogue-field', 'my-class', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when adding a class.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.ADD_CLASS);
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance.addClass('cvv', 'my-class', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot add class to "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.ADD_CLASS);
        done();
      });
    });
  });

  describe('removeClass', () => {
    beforeEach(() => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);
    });

    it('emits REMOVE_CLASS event', () => {
      testContext.instance.removeClass('number', 'my-class');
      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.REMOVE_CLASS, {
        field: 'number',
        classname: 'my-class'
      });
    });

    it('calls callback if provided', done => {
      testContext.instance.removeClass('number', 'my-class', done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance.removeClass('rogue-field', 'my-class', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when removing a class.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.REMOVE_CLASS);
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance.removeClass('cvv', 'my-class', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot remove class from "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.REMOVE_CLASS);
        done();
      });
    });
  });

  describe('setAttribute', () => {
    it('emits SET_ATTRIBUTE event if options are valid', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setAttribute({
        field: 'number',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      });

      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.SET_ATTRIBUTE, {
        field: 'number',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      });
    });

    it('calls callback if provided', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setAttribute({
        field: 'number',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      }, done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setAttribute({
        field: 'rogue-field',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      }, err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when setting an attribute.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('does not emit SET_ATTRIBUTE event when given non-allowed field', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setAttribute({
        field: 'rogue-field',
        attribute: 'placeholder',
        value: '1111 1111 1111 1111'
      }, () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setAttribute({
        field: 'cvv',
        attribute: 'placeholder',
        value: '123'
      }, err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot set attribute for "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('does not emit SET_ATTRIBUTE event when given field not supplied by merchant', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setAttribute({
        field: 'cvv',
        attribute: 'placeholder',
        value: '123'
      }, () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });
  });

  describe('setMonthOptions', () => {
    beforeEach(() => {
      testContext.defaultConfiguration.fields = {
        number: {
          selector: '#number'
        },
        expirationMonth: {
          selector: '#month',
          select: true
        }
      };

      testContext.monthDiv = document.createElement('div');
      testContext.monthDiv.id = 'month';
      document.body.appendChild(testContext.monthDiv);
    });

    it('emits SET_MONTH_OPTIONS event', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      jest.spyOn(testContext.instance._bus, 'emit');

      testContext.instance.setMonthOptions(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);

      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.SET_MONTH_OPTIONS, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], expect.any(Function));
    });

    it('errors if expirationMonth does not exist', () => {
      delete testContext.defaultConfiguration.fields.expirationMonth;

      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      return testContext.instance.setMonthOptions(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).then(rejectIfResolves).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_PROPERTY_INVALID');
        expect(err.message).toBe('Expiration month field must exist to use setMonthOptions.');
      });
    });

    it('errors if expirationMonth does not have a select property', () => {
      delete testContext.defaultConfiguration.fields.expirationMonth.select;

      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      return testContext.instance.setMonthOptions(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).then(rejectIfResolves).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_PROPERTY_INVALID');
        expect(err.message).toBe('Expiration month field must be a select element.');
      });
    });

    it('errors if expirationMonth\'s select property is false', () => {
      testContext.defaultConfiguration.fields.expirationMonth.select = false;

      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      return testContext.instance.setMonthOptions(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).then(rejectIfResolves).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_PROPERTY_INVALID');
        expect(err.message).toBe('Expiration month field must be a select element.');
      });
    });

    it('resolves when bus yields a response', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      jest.spyOn(testContext.instance._bus, 'emit').mockImplementation(yieldsAsync());

      return testContext.instance.setMonthOptions(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).then(response => {
        expect(response).toBeFalsy();
      });
    });
  });

  describe('setMessage', () => {
    it('emits SET_MESSAGE event if options are valid', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setMessage({
        field: 'number',
        message: 'This is a test message'
      });

      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.SET_MESSAGE, {
        field: 'number',
        message: 'This is a test message'
      });
    });
  });

  describe('removeAttribute', () => {
    it('emits REMOVE_ATTRIBUTE event if options are valid', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'number',
        attribute: 'disabled'
      });

      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.REMOVE_ATTRIBUTE, {
        field: 'number',
        attribute: 'disabled'
      });
    });

    it('calls callback if provided', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'number',
        attribute: 'disabled'
      }, done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'rogue-field',
        attribute: 'disabled'
      }, err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when removing an attribute.'
        );
        expect(err.details).not.toBeDefined();
        done();
      });
    });

    it('does not emit REMOVE_ATTRIBUTE event when given non-allowed field', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'rogue-field',
        attribute: 'disabled'
      }, () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.REMOVE_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'cvv',
        attribute: 'disabled'
      }, err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot remove attribute for "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        done();
      });
    });

    it('does not emit REMOVE_ATTRIBUTE event when given field not supplied by merchant', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'cvv',
        attribute: 'disabled'
      }, () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.REMOVE_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('calls errback when given non-allowed attribute', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'number',
        attribute: 'illegal'
      }, err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED');
        expect(err.message).toBe('The "illegal" attribute is not supported in Hosted Fields.');
        expect(err.details).not.toBeDefined();
        done();
      });
    });

    it('does not emit REMOVE_ATTRIBUTE event when given non-allowed attribute', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.removeAttribute({
        field: 'number',
        attribute: 'illegal'
      }, () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.REMOVE_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });
  });

  describe('setPlaceholder', () => {
    it('calls setAttribute', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      jest.spyOn(HostedFields.prototype, 'setAttribute');

      testContext.instance.setPlaceholder('number', 'great-placeholder');
      expect(testContext.instance.setAttribute).toHaveBeenCalledWith({
        field: 'number',
        attribute: 'placeholder',
        value: 'great-placeholder'
      });
    });

    it('calls callback if provided', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setPlaceholder('number', 'great-placeholder', done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setPlaceholder('rogue-field', 'rogue-placeholder', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when setting an attribute.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('does not emit SET_ATTRIBUTE event when given non-allowed field', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setPlaceholder('rogue-field', 'rogue-placeholder', () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setPlaceholder('cvv', 'great-placeholder', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot set attribute for "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });

    it('does not emit SET_ATTRIBUTE event when given field not supplied by merchant', done => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance.setPlaceholder('cvv', 'great-placeholder', () => {
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(
          events.SET_ATTRIBUTE,
          expect.anything()
        );
        done();
      });
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);
    });

    it('emits CLEAR_FIELD event', () => {
      testContext.instance.clear('number');
      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.CLEAR_FIELD, {
        field: expect.any(String)
      });
    });

    it('calls callback if provided', done => {
      testContext.instance.clear('number', done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance.clear('rogue-field', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when clearing a field.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.CLEAR_FIELD, {
          field: expect.any(String)
        });
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance.clear('cvv', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot clear "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.CLEAR_FIELD, {
          field: expect.any(String)
        });
        done();
      });
    });
  });

  describe('focus', () => {
    beforeEach(() => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);
    });

    it('emits TRIGGER_INPUT_FOCUS event', () => {
      testContext.instance.focus('number');

      expect(testContext.instance._bus.emit).toHaveBeenCalledWith(events.TRIGGER_INPUT_FOCUS, {
        field: expect.any(String)
      });
    });

    it('focuses on iframe', () => {
      const spy = jest.spyOn(testContext.instance._fields.number.frameElement, 'focus');

      testContext.instance.focus('number');

      expect(spy).toBeCalledTimes(1);
    });

    it('scrolls container into view when on ios and not visible', () => {
      jest.useFakeTimers();

      browserDetection.isIos.mockReturnValue(true);
      const spy = testContext.instance._fields.number.containerElement.scrollIntoView = jest.fn();

      testContext.instance.focus('number');

      jest.runAllTimers();

      expect(spy).toBeCalledTimes(1);

      jest.useRealTimers();
    });

    it('does not scroll container into view when on ios and aalready visible', () => {
      jest.useFakeTimers();

      browserDetection.isIos.mockReturnValue(true);
      const container = testContext.instance._fields.number.containerElement;
      const spy = container.scrollIntoView = jest.fn();

      container.getBoundingClientRect = jest.fn().mockReturnValue({
        height: 10,
        width: 10,
        bottom: 100,
        left: 100,
        right: 100,
        top: 100
      });

      testContext.instance.focus('number');

      jest.runAllTimers();

      expect(spy).not.toBeCalled();

      jest.useRealTimers();
    });

    it('does not scroll container into view when not on ios', () => {
      jest.useFakeTimers();

      browserDetection.isIos.mockReturnValue(false);
      const spy = testContext.instance._fields.number.containerElement.scrollIntoView = jest.fn();

      testContext.instance.focus('number');

      jest.runAllTimers();

      expect(spy).not.toBeCalled();

      jest.useRealTimers();
    });

    it('calls callback if provided', done => {
      testContext.instance.focus('number', done);
    });

    it('calls errback when given non-allowed field', done => {
      testContext.instance.focus('rogue-field', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_INVALID');
        expect(err.message).toBe(
          '"rogue-field" is not a valid field. You must use a valid field option when focusing a field.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.TRIGGER_INPUT_FOCUS, {
          field: expect.any(String)
        });
        done();
      });
    });

    it('calls errback when given field not supplied by merchant', done => {
      testContext.instance.focus('cvv', err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('HOSTED_FIELDS_FIELD_NOT_PRESENT');
        expect(err.message).toBe(
          'Cannot focus "cvv" field because it is not part of the current Hosted Fields options.'
        );
        expect(err.details).not.toBeDefined();
        expect(testContext.instance._bus.emit).not.toHaveBeenCalledWith(events.TRIGGER_INPUT_FOCUS, {
          field: expect.any(String)
        });
        done();
      });
    });
  });

  describe('getState', () => {
    it('returns the field state', () => {
      testContext.instance = new HostedFields(testContext.defaultConfiguration);

      testContext.instance._state = 'field state';
      expect(testContext.instance.getState()).toBe('field state');
    });
  });

  describe('getChallenges', () => {
    it('resolves with the array of challenges from configuration', async () => {
      const instance = new HostedFields(testContext.defaultConfiguration);
      const challenges = await instance.getChallenges();

      expect(challenges).toEqual(['cvv', 'postal_code']);
    });

    it('rejects if client fails to setup', async () => {
      createDeferredClient.create.mockRejectedValue(new Error('error'));

      const instance = new HostedFields(testContext.defaultConfiguration);

      await expect(instance.getChallenges()).rejects.toThrow('error');
    });
  });

  describe('getSupportedCardTypes', () => {
    it('resolves with the array of supported card types from configuration', async () => {
      const instance = new HostedFields(testContext.defaultConfiguration);
      const cardTypes = await instance.getSupportedCardTypes();

      expect(cardTypes).toEqual([
        'American Express',
        'Discover',
        'Visa'
      ]);
    });

    it('converts MasterCard -> Mastercard', async () => {
      testContext.defaultConfiguration.client.getConfiguration = () => {
        return {
          gatewayConfiguration: {
            creditCards: {
              supportedCardTypes: [
                'Visa',
                'MasterCard'
              ]
            }
          }
        };
      };
      const instance = new HostedFields(testContext.defaultConfiguration);
      const cardTypes = await instance.getSupportedCardTypes();

      expect(cardTypes).toEqual([
        'Visa',
        'Mastercard'
      ]);
    });

    it('rejects if client fails to setup', async () => {
      createDeferredClient.create.mockRejectedValue(new Error('error'));

      const instance = new HostedFields(testContext.defaultConfiguration);

      await expect(instance.getSupportedCardTypes()).rejects.toThrow('error');
    });
  });
});
