'use strict';
/* eslint-disable camelcase */

var camelCaseToSnakeCase = require('../../../src/lib/camel-case-to-snake-case');

describe('camelCaseToSnakeCase', function () {
  it('returns a new empty object', function () {
    var obj = {};

    expect(camelCaseToSnakeCase(obj)).not.to.equal(obj);
    expect(camelCaseToSnakeCase(obj)).to.deep.equal({});
  });

  it('returns a new object with keys snakeified', function () {
    var obj = {
      foo: 'boo',
      barBaz: 'wow',
      soMuchWow: 'yes',
      no_no: 'no',
      X: 'y',
      AuthorizationThing: 'password123'
    };

    expect(camelCaseToSnakeCase(obj)).to.deep.equal({
      foo: 'boo',
      bar_baz: 'wow',
      so_much_wow: 'yes',
      no_no: 'no',
      x: 'y',
      authorization_thing: 'password123'
    });
  });
});
