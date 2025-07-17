"use strict";

const camelCaseToSnakeCase = require("../../../src/lib/camel-case-to-snake-case");

describe("camelCaseToSnakeCase", () => {
  it("returns a new empty object", () => {
    const object = {};

    expect(camelCaseToSnakeCase(object)).not.toBe(object);
    expect(camelCaseToSnakeCase(object)).toEqual({});
  });

  it("returns a new object with keys snakeified", () => {
    const object = {
      foo: "boo",
      barBaz: "wow",
      soMuchWow: "yes",
      no_no: "no",
      X: "y",
      AuthorizationThing: "password123",
    };
    const expectedObject = {
      foo: "boo",
      bar_baz: "wow",
      so_much_wow: "yes",
      no_no: "no",
      x: "y",
      authorization_thing: "password123",
    };

    expect(camelCaseToSnakeCase(object)).toEqual(expectedObject);
  });

  it("returns a snakeified array", () => {
    const array = [
      {
        someDefinitelyCamelCasedProperty: "some value",
      },
    ];
    const expectedArray = [
      {
        some_definitely_camel_cased_property: "some value",
      },
    ];

    expect(camelCaseToSnakeCase(array)).toEqual(expectedArray);
  });

  it("returns a snakeified nested object", () => {
    const object = {
      blahBlahBlah: {
        superBlahBlah: {
          turboBlahBlah: "hi",
        },
      },
    };
    const expectedObject = {
      blah_blah_blah: {
        super_blah_blah: {
          turbo_blah_blah: "hi",
        },
      },
    };

    expect(camelCaseToSnakeCase(object)).toEqual(expectedObject);
  });

  it("returns a snakeified nested array", () => {
    const objectWithArray = {
      superBlahBlah: [
        {
          someCamelCasedProperty: "ding",
        },
        {
          anotherCamelCasedProperty: "dong",
        },
      ],
    };
    const expectedObjectWithArray = {
      super_blah_blah: [
        {
          some_camel_cased_property: "ding",
        },
        {
          another_camel_cased_property: "dong",
        },
      ],
    };

    expect(camelCaseToSnakeCase(objectWithArray)).toEqual(
      expectedObjectWithArray
    );
  });

  it("returns the value if it is a non-object or array", () => {
    const value = "hi";
    const expectedValue = "hi";

    expect(camelCaseToSnakeCase(value)).toEqual(expectedValue);
  });

  it("returns an array of values as is", () => {
    const arrayOfValues = ["hi", "there"];
    const expectedArrayOfValues = ["hi", "there"];

    expect(camelCaseToSnakeCase(arrayOfValues)).toEqual(expectedArrayOfValues);
  });

  it("handles null values", () => {
    const input = {
      nullableValue: null,
    };
    const expectedOutput = {
      nullable_value: null,
    };

    expect(camelCaseToSnakeCase(input)).toEqual(expectedOutput);
  });

  it("handles undefined values", () => {
    const input = {
      undefinedValue: undefined,
    };
    const expectedOutput = {
      undefined_value: undefined,
    };

    expect(camelCaseToSnakeCase(input)).toEqual(expectedOutput);
  });
});
