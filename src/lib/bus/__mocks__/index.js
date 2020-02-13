'use strict';

const events = require('../events');

function BraintreeBus({ channel }) {
  this.channel = channel;
}

BraintreeBus.prototype.on = jest.fn();
BraintreeBus.prototype.emit = jest.fn();
BraintreeBus.prototype.off = jest.fn();
BraintreeBus.prototype.teardown = jest.fn();

BraintreeBus.events = events;

module.exports = BraintreeBus;
