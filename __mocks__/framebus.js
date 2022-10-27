/* eslint-env jest */
"use strict";

function Framebus(options) {
  this.channel = options.channel;
}
Framebus.prototype.on = jest.fn();
Framebus.prototype.off = jest.fn();
Framebus.prototype.emit = jest.fn();
Framebus.prototype.target = jest.fn().mockReturnThis();
Framebus.prototype.teardown = jest.fn();

module.exports = Framebus;
