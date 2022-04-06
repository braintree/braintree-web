"use strict";

const find = require("../../../src/lib/find");

describe("find", () => {
  it("returns null for empty array inputs", () => {
    expect(find([], "type", "foo")).toBeNull();
  });

  it("returns null when unable to find key value pair", () => {
    const arr = [
      {
        key: "value 1",
      },
      {
        key: "value 2",
      },
    ];

    expect(find(arr, "type", "foo")).toBeNull();
  });

  it("returns the only matching element from the provided array", () => {
    const arr = [
      {
        type: "bar",
        key2: "bar 2",
      },
      {
        type: "foo",
        key2: "foo 2",
      },
      {
        type: "baz",
        key2: "baz 2",
      },
    ];

    expect(find(arr, "type", "foo")).toEqual({
      type: "foo",
      key2: "foo 2",
    });
  });

  it("returns the first matching element from the provided array if multiple matches exist", () => {
    const arr = [
      {
        type: "foo",
        key2: "foo 2",
        index: 0,
      },
      {
        type: "foo",
        key2: "foo 2",
        index: 1,
      },
      {
        type: "baz",
        key2: "baz 2",
        index: 2,
      },
    ];

    expect(find(arr, "type", "foo")).toEqual({
      type: "foo",
      key2: "foo 2",
      index: 0,
    });
  });
});
