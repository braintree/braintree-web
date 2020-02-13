'use strict';
/* eslint-disable camelcase */

const camelCaseToSnakeCase = require('../../../src/lib/camel-case-to-snake-case');

describe('camelCaseToSnakeCase', () => {
  it('returns a new empty object', () => {
    const obj = {};

    expect(camelCaseToSnakeCase(obj)).not.toBe(obj);
    expect(camelCaseToSnakeCase(obj)).toEqual({});
  });

  it('returns a new object with keys snakeified', () => {
    const obj = {
      foo: 'boo',
      barBaz: 'wow',
      soMuchWow: 'yes',
      no_no: 'no',
      X: 'y',
      AuthorizationThing: 'password123'
    };

    expect(camelCaseToSnakeCase(obj)).toEqual({
      foo: 'boo',
      bar_baz: 'wow',
      so_much_wow: 'yes',
      no_no: 'no',
      x: 'y',
      authorization_thing: 'password123'
    });
  });
});
