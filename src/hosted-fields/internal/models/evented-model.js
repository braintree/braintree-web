"use strict";

var EventEmitter = require("@braintree/event-emitter");

function EventedModel() {
  EventEmitter.call(this);

  this._attributes = this.resetAttributes();
}

EventEmitter.createChild(EventedModel);

EventedModel.prototype.get = function get(compoundKey) {
  var i, key, keys;
  var traversal = this._attributes;

  if (compoundKey == null) {
    return traversal;
  }

  keys = compoundKey.split(".");

  for (i = 0; i < keys.length; i++) {
    key = keys[i];

    if (!traversal.hasOwnProperty(key)) {
      return; // eslint-disable-line consistent-return
    }

    traversal = traversal[key];
  }

  return traversal;
};

EventedModel.prototype.set = function set(compoundKey, value) {
  var i, key, keys, oldValue;
  var traversal = this._attributes;

  keys = compoundKey.split(".");

  for (i = 0; i < keys.length - 1; i++) {
    key = keys[i];

    if (!traversal.hasOwnProperty(key)) {
      traversal[key] = {};
    }

    traversal = traversal[key];
  }
  key = keys[i];

  if (traversal[key] !== value) {
    oldValue = traversal[key];
    traversal[key] = value;
    this._emit("change");
    for (i = 1; i <= keys.length; i++) {
      key = keys.slice(0, i).join(".");
      this._emit("change:" + key, this.get(key), {
        old: oldValue,
      });
    }
  }
};

EventedModel.prototype.resetAttributes = function resetAttributes() {
  return {};
};

module.exports = EventedModel;
