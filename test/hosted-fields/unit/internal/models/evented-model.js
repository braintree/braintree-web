"use strict";

const util = require("util");
const EventedModel = require("../../../../../src/hosted-fields/internal/models/evented-model");

describe("EventedModel", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.model = new EventedModel();
  });

  it("returns undefined when getting an empty property", () => {
    expect(testContext.model.get("foo")).not.toBeDefined();
  });

  it("can set a single property and retrieve it", () => {
    testContext.model.set("foo", 123);
    expect(testContext.model.get("foo")).toBe(123);

    testContext.model.set("foo", 456);
    expect(testContext.model.get("foo")).toBe(456);
  });

  it("can get the whole object", () => {
    testContext.model.set("foo", 123);
    testContext.model.set("bar", 456);

    expect(testContext.model.get()).toEqual({
      foo: 123,
      bar: 456,
    });
  });

  it("can get and set nested objects with string keys", () => {
    testContext.model.set("foo.bar", 456);
    testContext.model.set("foo.yas", 789);
    testContext.model.set("foo.baz.whoa", "what");
    testContext.model.set("foo.baz.hecka", "cool");

    expect(testContext.model.get("foo")).toEqual({
      bar: 456,
      yas: 789,
      baz: {
        whoa: "what",
        hecka: "cool",
      },
    });
  });

  it('returns undefined if you go too "deep"', () => {
    const model = testContext.model;

    model.set("foo.bar", 456);

    expect(model.get("foo.baz.tooDeep")).not.toBeDefined();
  });

  it("can overwrite an object with a non-object", () => {
    testContext.model.set("foo.bar", "YASS");
    testContext.model.set("foo", 123);

    expect(testContext.model.get("foo")).toBe(123);
    expect(testContext.model.get("foo.bar")).not.toBeDefined();
  });

  it('emits a "global" event when a property changes', (done) => {
    testContext.model.on("change", () => {
      done();
    });

    testContext.model.set("foo", 789);
  });

  it("emits a scoped change event when a property changes", (done) => {
    testContext.model.on("change:foo", (newValue) => {
      expect(newValue).toBe(789);
      done();
    });

    testContext.model.set("foo", 789);
  });

  it("emits metadata with the old value as second argument for a scoped change event when a property changes", (done) => {
    testContext.model.set("foo", 123);

    testContext.model.on("change:foo", (newValue, metadata) => {
      expect(metadata.old).toBe(123);
      expect(newValue).toBe(789);
      done();
    });

    testContext.model.set("foo", 789);
  });

  it("emits an intermediate-scope change event when a nested property changes", (done) => {
    testContext.model.on("change:foo", (newValue) => {
      expect(newValue).toEqual({ bar: "yas" });
      done();
    });

    testContext.model.set("foo.bar", "yas");
  });

  it("emits metadata with only the old value that changed, not the whole object when a nested property changes", (done) => {
    testContext.model.set("foo.bar", "foo");

    testContext.model.on("change:foo", (newValue, metadata) => {
      expect(metadata.old).toEqual("foo");
      expect(newValue).toEqual({ bar: "yas" });
      done();
    });

    testContext.model.set("foo.bar", "yas");
  });

  it("emits a scoped change event when a nested property changes", (done) => {
    testContext.model.on("change:foo.bar", (newValue) => {
      expect(newValue).toBe("yas");
      done();
    });

    testContext.model.set("foo.bar", "yas");
  });

  it("emits metadata with the old value as a second argument for a scoped change event when a nested property changes", (done) => {
    testContext.model.set("foo.bar", "foo");

    testContext.model.on("change:foo.bar", (newValue, metadata) => {
      expect(metadata.old).toBe("foo");
      expect(newValue).toBe("yas");
      done();
    });

    testContext.model.set("foo.bar", "yas");
  });

  it("is reset initially", () => {
    let model;

    function Child() {
      EventedModel.apply(this, arguments);
    }

    util.inherits(Child, EventedModel);

    Child.prototype.resetAttributes = () => ({
      foo: {
        bar: 456,
        yas: 789,
        baz: {
          whoa: "what",
          hecka: "cool",
        },
      },
    });

    model = new Child();

    expect(model.get("foo")).toEqual({
      bar: 456,
      yas: 789,
      baz: {
        whoa: "what",
        hecka: "cool",
      },
    });
  });
});
