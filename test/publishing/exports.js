"use strict";

const { version: VERSION } = require("../../package.json");
const braintreeNpm = require("../../dist/npm");
const braintreeBower = require("../../dist/bower");
const braintreeDebug = require("../../dist/bower/debug");
const braintreeHosted = require(`../../dist/hosted/web/${VERSION}/js/index`);
const braintreeMin = require(`../../dist/hosted/web/${VERSION}/js/index.min`);
const components = require("../helpers/components").components.reduce(
  (result, component) => {
    result[component] = {
      npm: require(`../../dist/npm/${component}`),
      bower: require(`../../dist/bower/${component}`),
      bowerDebug: require(`../../dist/bower/${component}.debug`),
      hosted: require(`../../dist/hosted/web/${VERSION}/js/${component}`),
      hostedMin: require(
        `../../dist/hosted/web/${VERSION}/js/${component}.min`
      ),
    };

    return result;
  },
  {}
);
const componentNames = Object.keys(components).map((key) =>
  key.replace(/-./g, (str) => str[1].toUpperCase())
);

describe("exports", () => {
  describe.each([
    ["npm", braintreeNpm],
    ["bower", braintreeBower],
    ["debug", braintreeDebug],
    ["hosted", braintreeHosted],
    ["min", braintreeMin],
  ])("braintree module %p", (moduleName, distFile) => {
    it(`exports VERSION for ${moduleName}`, () => {
      expect(distFile.VERSION).toBe(VERSION);
    });

    it(`exports components for ${moduleName}`, () => {
      expect(Object.keys(distFile)).toStrictEqual(
        expect.arrayContaining(componentNames)
      );
    });
  });

  describe.each(Object.keys(components))("component module %p", (key) => {
    it(`exports VERSION for component module ${key}`, () => {
      expect(components[key].npm.VERSION).toBe(VERSION);
      expect(components[key].bower.VERSION).toBe(VERSION);
      expect(components[key].bowerDebug.VERSION).toBe(VERSION);
      expect(components[key].hosted.VERSION).toBe(VERSION);
      expect(components[key].hostedMin.VERSION).toBe(VERSION);
    });

    it(`exports create for component module ${key}`, () => {
      expect(components[key].npm.create).toBeInstanceOf(Function);
      expect(components[key].bower.create).toBeInstanceOf(Function);
      expect(components[key].bowerDebug.create).toBeInstanceOf(Function);
      expect(components[key].hosted.create).toBeInstanceOf(Function);
      expect(components[key].hostedMin.create).toBeInstanceOf(Function);
    });
  });
});
