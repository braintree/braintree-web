"use strict";

const isDateStringBeforeOrOn = require("../../../src/lib/is-date-string-before-or-on");

describe("isDateStringBeforeOrOn", () => {
  it("is true if the first argument is a date chronologically before the second", () => {
    const firstDate = "2018-05-05";
    const secondDate = "2018-05-10";

    expect(isDateStringBeforeOrOn(firstDate, secondDate)).toBe(true);
    expect(isDateStringBeforeOrOn(secondDate, firstDate)).toBe(false);
  });

  it("is true if the first argument is the same as the second", () => {
    const firstDate = "2018-05-05";
    const secondDate = "2018-05-05";

    expect(isDateStringBeforeOrOn(firstDate, secondDate)).toBe(true);
  });
});
