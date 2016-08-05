'use strict';

var framebus = require('framebus');
var Bus = require('../../../../src/lib/bus');
var BraintreeError = require('../../../../src/lib/error');

describe('braintree bus', function () {
  beforeEach(function () {
    var firstEvent = Object.keys(Bus.events)[0];

    this.bus = new Bus({channel: 'foo'});

    Bus.prototype.on.restore();
    Bus.prototype.off.restore();
    Bus.prototype.emit.restore();
    this.sandbox.stub(framebus, 'on', function () {});
    this.sandbox.stub(framebus, 'off', function () {});
    this.sandbox.stub(framebus, 'emit', function () {});

    this.event = Bus.events[firstEvent];

    this.handler = function () {};
    this.payload = {};
  });

  it('throws an error when instantiated without a channel', function () {
    /* eslint-disable no-new */
    var err;

    try {
      new Bus();
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.type).to.equal('INTERNAL');
    expect(err.code).to.equal('MISSING_CHANNEL_ID');
    expect(err.message).to.equal('Channel ID must be specified.');

    err = null;

    try {
      new Bus({});
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.type).to.equal('INTERNAL');
    expect(err.code).to.equal('MISSING_CHANNEL_ID');
    expect(err.message).to.equal('Channel ID must be specified.');

    try {
      new Bus({channel: null});
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.type).to.equal('INTERNAL');
    expect(err.code).to.equal('MISSING_CHANNEL_ID');
    expect(err.message).to.equal('Channel ID must be specified.');
    /* eslint-enable no-new */
  });

  describe('on', function () {
    it('proxies to Framebus\'s on', function () {
      this.bus.on(this.event, this.handler);
      expect(framebus.on).to.have.been.calledWith('braintree:foo:' + this.event, this.handler);
    });

    it.skip('throws an error if called with an invalid event name', function () {
      var bus = this.bus;

      expect(function () {
        bus.on('bar', function () {});
      }).to.throw('bar is an invalid Braintree event');
    });
  });

  describe('off', function () {
    it('proxies to Framebus\'s off', function () {
      this.bus.off(this.event, this.handler);
      expect(framebus.off).to.have.been.calledWith('braintree:foo:' + this.event, this.handler);
    });

    it.skip('throws an error if called with an invalid event name', function () {
      var bus = this.bus;

      expect(function () {
        bus.off('bar', function () {});
      }).to.throw('bar is an invalid Braintree event');
    });
  });

  describe('emit', function () {
    it('proxies to Framebus\'s emit', function () {
      this.bus.emit(this.event, this.payload, this.handler);
      expect(framebus.emit).to.have.been.calledWith('braintree:foo:' + this.event, this.payload, this.handler);
    });

    it.skip('throws an error if called with an invalid event name', function () {
      var bus = this.bus;

      expect(function () {
        bus.emit('bar', {}, function () {});
      }).to.throw('bar is an invalid Braintree event');
    });
  });

  describe('teardown', function () {
    it('calls off for every added listener, even ones already removed', function () {
      var event1 = Bus.events[Object.keys(Bus.events)[0]];
      var event2 = Bus.events[Object.keys(Bus.events)[1]];
      var event3 = Bus.events[Object.keys(Bus.events)[2]];

      function handler1() {}
      function handler2() {}
      function handler3() {}

      this.bus.on(event1, handler1);
      this.bus.on(event2, handler2);
      this.bus.on(event3, handler3);

      this.bus.off(event2, handler2);

      this.sandbox.spy(this.bus, '_offDirect');

      this.bus.teardown();

      expect(this.bus._offDirect).to.have.been.calledWith(event1, handler1);
      expect(this.bus._offDirect).to.have.been.calledWith(event2, handler2);
      expect(this.bus._offDirect).to.have.been.calledWith(event3, handler3);
    });

    it('only unsubscribes from events once', function () {
      this.sandbox.spy(this.bus, '_offDirect');

      this.bus.on(this.event, this.handler);
      this.bus.teardown();
      this.bus.teardown();

      expect(this.bus._offDirect).to.have.been.calledOnce;
    });

    it('doesn\'t proxy to framebus after calling', function () {
      this.bus.teardown();

      this.bus.on(this.event, this.handler);
      expect(framebus.on).not.to.have.been.called;

      this.bus.off(this.event, this.handler);
      expect(framebus.off).not.to.have.been.called;

      this.bus.emit(this.event);
      expect(framebus.emit).not.to.have.been.called;
    });
  });
});
