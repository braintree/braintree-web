"use strict";

const {
  LabelComponent,
} = require("../../../../../src/hosted-fields/internal/components/label");

describe("LabelComponent", () => {
  it("creates a label element", () => {
    const { element } = new LabelComponent({
      name: "foo",
      label: "Foo",
    });

    expect(element).toBeInstanceOf(HTMLLabelElement);
  });

  it("populates `for` and innerHTML from arguments", () => {
    const { element } = new LabelComponent({
      name: "foo",
      label: "Foo",
    });

    expect(element.getAttribute("for")).toBe("foo");
    expect(element.innerText).toBe("Foo");
  });
});
