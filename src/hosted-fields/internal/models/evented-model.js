// @ts-nocheck
import EventEmitter from "@braintree/event-emitter";

var DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

function EventedModel() {
  EventEmitter.call(this);

  this._attributes = this.resetAttributes();
}

EventedModel.prototype = Object.create(EventEmitter.prototype, {
  constructor: { value: EventedModel },
});

EventedModel.prototype.get = function get(compoundKey) {
  var i, key, keys;
  var traversal = this._attributes;

  if (compoundKey == null) {
    return traversal;
  }

  keys = compoundKey.split(".");

  for (i = 0; i < keys.length; i++) {
    key = keys[i];

    if (DANGEROUS_KEYS.indexOf(key) !== -1) {
      return; // eslint-disable-line consistent-return
    }

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

    if (DANGEROUS_KEYS.indexOf(key) !== -1) {
      return;
    }

    if (!traversal.hasOwnProperty(key)) {
      traversal[key] = {};
    }

    traversal = traversal[key];
  }
  key = keys[i];

  if (DANGEROUS_KEYS.indexOf(key) !== -1) {
    return;
  }

  if (traversal[key] !== value) {
    oldValue = traversal[key];
    traversal[key] = value;
    this.emit("change");
    for (i = 1; i <= keys.length; i++) {
      key = keys.slice(0, i).join(".");
      this.emit("change:" + key, {
        value: this.get(key),
        old: oldValue,
      });
    }
  }
};

EventedModel.prototype.resetAttributes = function resetAttributes() {
  return {};
};

export default EventedModel;
