'use strict';

var EventedModel = require('../../../../../src/hosted-fields/internal/models/evented-model');
var util = require('util');

describe('EventedModel', function () {
  beforeEach(function () {
    this.model = new EventedModel();
  });

  it('returns undefined when getting an empty property', function () {
    expect(this.model.get('foo')).not.to.exist;
  });

  it('can set a single property and retrieve it', function () {
    this.model.set('foo', 123);
    expect(this.model.get('foo')).to.equal(123);

    this.model.set('foo', 456);
    expect(this.model.get('foo')).to.equal(456);
  });

  it('can get the whole object', function () {
    this.model.set('foo', 123);
    this.model.set('bar', 456);

    expect(this.model.get()).to.deep.equal({
      foo: 123,
      bar: 456
    });
  });

  it('can get and set nested objects with string keys', function () {
    this.model.set('foo.bar', 456);
    this.model.set('foo.yas', 789);
    this.model.set('foo.baz.woah', 'what');
    this.model.set('foo.baz.hecka', 'cool');

    expect(this.model.get('foo')).to.deep.equal({
      bar: 456,
      yas: 789,
      baz: {
        woah: 'what',
        hecka: 'cool'
      }
    });
  });

  it('returns undefined if you go too "deep"', function () {
    var model = this.model;

    model.set('foo.bar', 456);

    expect(model.get('foo.baz.tooDeep')).not.to.exist;
  });

  it('can overwrite an object with a non-object', function () {
    this.model.set('foo.bar', 'YASS');
    this.model.set('foo', 123);

    expect(this.model.get('foo')).to.equal(123);
    expect(this.model.get('foo.bar')).not.to.exist;
  });

  it('emits a "global" event when a property changes', function (done) {
    this.model.on('change', function () {
      done();
    });

    this.model.set('foo', 789);
  });

  it('emits a scoped change event when a property changes', function (done) {
    this.model.on('change:foo', function (newValue) {
      expect(newValue).to.equal(789);
      done();
    });

    this.model.set('foo', 789);
  });

  it('emits metatadata with the old value as second argument for a scoped change event when a property changes', function (done) {
    this.model.set('foo', 123);

    this.model.on('change:foo', function (newValue, metadata) {
      expect(metadata.old).to.equal(123);
      expect(newValue).to.equal(789);
      done();
    });

    this.model.set('foo', 789);
  });

  it('emits an intermediate-scope change event when a nested property changes', function (done) {
    this.model.on('change:foo', function (newValue) {
      expect(newValue).to.deep.equal({bar: 'yas'});
      done();
    });

    this.model.set('foo.bar', 'yas');
  });

  it('emits metadata with only the old value that changed, not the whole object when a nested property changes', function (done) {
    this.model.set('foo.bar', 'foo');

    this.model.on('change:foo', function (newValue, metadata) {
      expect(metadata.old).to.deep.equal('foo');
      expect(newValue).to.deep.equal({bar: 'yas'});
      done();
    });

    this.model.set('foo.bar', 'yas');
  });

  it('emits a scoped change event when a nested property changes', function (done) {
    this.model.on('change:foo.bar', function (newValue) {
      expect(newValue).to.equal('yas');
      done();
    });

    this.model.set('foo.bar', 'yas');
  });

  it('emits metadata with the old value as a second argument for a scoped change event when a nested property changes', function (done) {
    this.model.set('foo.bar', 'foo');

    this.model.on('change:foo.bar', function (newValue, metadata) {
      expect(metadata.old).to.equal('foo');
      expect(newValue).to.equal('yas');
      done();
    });

    this.model.set('foo.bar', 'yas');
  });

  it('is reset initially', function () {
    var model;

    function Child() {
      EventedModel.apply(this, arguments);
    }
    util.inherits(Child, EventedModel);

    Child.prototype.resetAttributes = function () {
      return {
        foo: {
          bar: 456,
          yas: 789,
          baz: {
            woah: 'what',
            hecka: 'cool'
          }
        }
      };
    };

    model = new Child();

    expect(model.get('foo')).to.deep.equal({
      bar: 456,
      yas: 789,
      baz: {
        woah: 'what',
        hecka: 'cool'
      }
    });
  });
});
