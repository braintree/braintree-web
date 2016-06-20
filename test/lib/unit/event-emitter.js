'use strict';

var EventEmitter = require('../../../src/lib/event-emitter');

describe('EventEmitter', function () {
  it('can emit when no one is listening', function () {
    var emitter = new EventEmitter();

    expect(function () {
      emitter._emit('foo');
    }).not.to.throw();
  });

  it('can subscribe to events', function (done) {
    var emitter = new EventEmitter();

    emitter.on('foo', function () {
      done();
    });

    emitter._emit('foo');
  });

  it('calls events with arguments', function (done) {
    var expected1 = 'somethinghere';
    var expected2 = 'somethingElse';
    var emitter = new EventEmitter();

    emitter.on('foo', function (actual1, actual2) {
      expect(actual1).to.equal(expected1);
      expect(actual2).to.equal(expected2);
      done();
    });

    emitter._emit('foo', expected1, expected2);
  });

  it('aborts with callbacks that error', function () {
    var emitter = new EventEmitter();
    var thirdCallback = this.sandbox.stub();

    emitter.on('foo', function () {});

    emitter.on('foo', function () {
      throw new Error('danger zone!');
    });

    emitter.on('foo', thirdCallback);

    expect(function () {
      emitter._emit('foo');
    }).to.throw('danger zone!');

    expect(thirdCallback).not.to.have.beenCalled;
  });
});
