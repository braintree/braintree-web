'use strict';

jest.unmock('../../../../src/lib/bus');
jest.mock('framebus');

const framebus = require('framebus');
const Bus = require('../../../../src/lib/bus');
const BraintreeError = require('../../../../src/lib/braintree-error');
const { noop } = require('../../../helpers');

describe('braintree bus', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    const firstEvent = Object.keys(Bus.events)[0];

    testContext.bus = new Bus({ channel: 'foo' });

    jest.spyOn(framebus, 'on');
    jest.spyOn(framebus, 'off');
    jest.spyOn(framebus, 'emit');

    testContext.event = Bus.events[firstEvent];

    testContext.handler = noop;
    testContext.payload = {};
  });

  it.each([
    undefined, {}, { channel: null }  // eslint-disable-line no-undefined
  ])('throws an error when instantiated without a channel', badChannel => {
    expect.assertions(4);

    try {
      new Bus(badChannel);
    } catch (err) {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe('INTERNAL');
      expect(err.code).toBe('MISSING_CHANNEL_ID');
      expect(err.message).toBe('Channel ID must be specified.');
    }
  });

  describe.each(['on', 'off', 'emit'])('base method %s', method => {
    it(`proxies to Framebus's ${method}`, () => {
      testContext.bus[method](testContext.event, testContext.handler);
      expect(framebus[method]).toHaveBeenCalledWith(`braintree:foo:${testContext.event}`, testContext.handler);
    });

    /*
    * This functionality is not implemented
    * */
    it.skip('throws an error if called with an invalid event name', () => {
      const bus = testContext.bus;

      expect(() => {
        bus[method]('bar', noop);
      }).toThrowError('bar is an invalid Braintree event');
    });
  });

  describe('teardown', () => {
    it('calls off for every added listener, even ones already removed', () => {
      const event1 = Bus.events[Object.keys(Bus.events)[0]];
      const event2 = Bus.events[Object.keys(Bus.events)[1]];
      const event3 = Bus.events[Object.keys(Bus.events)[2]];

      const handler1 = noop;
      const handler2 = noop;
      const handler3 = noop;

      testContext.bus.on(event1, handler1);
      testContext.bus.on(event2, handler2);
      testContext.bus.on(event3, handler3);

      testContext.bus.off(event2, handler2);

      jest.spyOn(testContext.bus, '_offDirect');

      testContext.bus.teardown();

      expect(testContext.bus._offDirect).toHaveBeenCalledWith(event1, handler1);
      expect(testContext.bus._offDirect).toHaveBeenCalledWith(event2, handler2);
      expect(testContext.bus._offDirect).toHaveBeenCalledWith(event3, handler3);
    });

    it('only unsubscribes from events once', () => {
      jest.spyOn(testContext.bus, '_offDirect');

      testContext.bus.on(testContext.event, testContext.handler);
      testContext.bus.teardown();
      testContext.bus.teardown();

      expect(testContext.bus._offDirect).toHaveBeenCalledTimes(1);
    });

    it('doesn\'t proxy to framebus after calling', () => {
      testContext.bus.teardown();

      testContext.bus.on(testContext.event, testContext.handler);
      expect(framebus.on).not.toHaveBeenCalled();

      testContext.bus.off(testContext.event, testContext.handler);
      expect(framebus.off).not.toHaveBeenCalled();

      testContext.bus.emit(testContext.event);
      expect(framebus.emit).not.toHaveBeenCalled();
    });
  });
});
