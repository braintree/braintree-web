import util from "util";
import EventedModel from "../../../../../src/hosted-fields/internal/models/evented-model";

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

  it('emits a "global" event when a property changes', () =>
    new Promise((resolve) => {
      testContext.model.on("change", () => {
        resolve();
      });

      testContext.model.set("foo", 789);
    }));

  it("emits a scoped change event when a property changes", () =>
    new Promise((resolve) => {
      testContext.model.on("change:foo", (payload) => {
        expect(payload.value).toBe(789);
        resolve();
      });

      testContext.model.set("foo", 789);
    }));

  it("emits metadata with the old value as second argument for a scoped change event when a property changes", () =>
    new Promise((resolve) => {
      testContext.model.set("foo", 123);

      testContext.model.on("change:foo", (payload) => {
        expect(payload.old).toBe(123);
        expect(payload.value).toBe(789);
        resolve();
      });

      testContext.model.set("foo", 789);
    }));

  it("emits an intermediate-scope change event when a nested property changes", () =>
    new Promise((resolve) => {
      testContext.model.on("change:foo", (payload) => {
        expect(payload.value).toEqual({ bar: "yas" });
        resolve();
      });

      testContext.model.set("foo.bar", "yas");
    }));

  it("emits metadata with only the old value that changed, not the whole object when a nested property changes", () =>
    new Promise((resolve) => {
      testContext.model.set("foo.bar", "foo");

      testContext.model.on("change:foo", (payload) => {
        expect(payload.old).toEqual("foo");
        expect(payload.value).toEqual({ bar: "yas" });
        resolve();
      });

      testContext.model.set("foo.bar", "yas");
    }));

  it("emits a scoped change event when a nested property changes", () =>
    new Promise((resolve) => {
      testContext.model.on("change:foo.bar", (payload) => {
        expect(payload.value).toBe("yas");
        resolve();
      });

      testContext.model.set("foo.bar", "yas");
    }));

  it("emits metadata with the old value as a second argument for a scoped change event when a nested property changes", () =>
    new Promise((resolve) => {
      testContext.model.set("foo.bar", "foo");

      testContext.model.on("change:foo.bar", (payload) => {
        expect(payload.old).toBe("foo");
        expect(payload.value).toBe("yas");
        resolve();
      });

      testContext.model.set("foo.bar", "yas");
    }));

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

  it("does not allow setting __proto__ keys", () => {
    testContext.model.set("__proto__.polluted", "yes");
    expect({}.polluted).not.toBeDefined();
  });

  it("does not allow setting constructor keys", () => {
    testContext.model.set("constructor.prototype.polluted", "yes");
    expect({}.polluted).not.toBeDefined();
  });

  it("does not allow setting prototype keys", () => {
    testContext.model.set("prototype.polluted", "yes");
    expect({}.polluted).not.toBeDefined();
  });

  it("returns undefined for get with __proto__ key", () => {
    expect(testContext.model.get("__proto__")).not.toBeDefined();
  });
});
