'use strict';

const querystring = require('../../../src/lib/querystring');
const { noop } = require('../../helpers');

describe('querystring', () => {
  describe('hasQueryParams', () => {
    it('returns true when url has query params', () => {
      expect(querystring.hasQueryParams('https://example.com?foo=bar')).toBe(true);
    });

    it('returns false when url does not have query params', () => {
      expect(querystring.hasQueryParams('https://example.com')).toBe(false);
    });
  });

  describe('queryify', () => {
    it('returns an unmodified url if no params are given', () => {
      const url = 'http://httpbin.org/ip';

      expect(querystring.queryify(url)).toBe(url);
    });

    it('returns an unmodified url if given an empty params object', () => {
      const url = 'http://httpbin.org/ip';

      expect(querystring.queryify(url, {})).toBe(url);
    });

    it('returns a url with params', () => {
      const url = 'http://httpbin.org/ip';
      const params = { foo: 'bar', baz: 'qux' };

      expect(querystring.queryify(url, params)).toBe(`${url}?foo=bar&baz=qux`);
    });

    it('returns a url with params if given a nested params object', () => {
      const url = 'http://httpbin.org/ip';
      const params = { foo: { bar: { baz: 'qux' }}};

      expect(querystring.queryify(url, params)).toBe(url + encodeURI('?foo[bar][baz]=qux'));
    });

    it('returns query params if no url is given', () => {
      const params = { foo: 'bar', baz: 'qux' };

      expect(querystring.queryify(null, params)).toBe('?foo=bar&baz=qux');
    });

    it('returns query params if url is "?"', () => {
      const url = '?';
      const params = { foo: 'bar', baz: 'qux' };

      expect(querystring.queryify(url, params)).toBe(`${url}foo=bar&baz=qux`);
    });

    it('returns query params appended if url already has query params', () => {
      const url = '?oogle=foogle';
      const params = { foo: 'bar', baz: 'qux' };

      expect(querystring.queryify(url, params)).toBe(`${url}&foo=bar&baz=qux`);
    });

    it('returns unmodified url if invalid params are passed', () => {
      const url = 'http://httpbin.org/ip';

      expect(querystring.queryify(url, 1)).toBe(url);
      expect(querystring.queryify(url, null)).toBe(url);
      expect(querystring.queryify(url, '')).toBe(url);
      expect(querystring.queryify(url)).toBe(url);
    });
  });

  describe('stringify', () => {
    it('turns an object into a GET string', () => {
      const params = { hello: '1', world: 'some string', integer: 1, dbl: 2.0 };

      expect(querystring.stringify(params)).toBe('hello=1&world=some%20string&integer=1&dbl=2');
    });

    it('encodes an array as a url encoded string', () => {
      const params = {
        myArray: [
          0,
          'second',
          { ordinal: 'third' }
        ]
      };

      expect(querystring.stringify(params)).toEqual('myArray%5B%5D=0&myArray%5B%5D=second&myArray%5B%5D%5Bordinal%5D=third');
    });

    it('encodes a nested object as a url encoded string', () => {
      const params = {
        topLevel: '1',
        nested: {
          hello: '2',
          world: '3',
          nestedNested: {
            1: '1'
          }
        }
      };

      expect(querystring.stringify(params)).toEqual('topLevel=1&nested%5Bhello%5D=2&nested%5Bworld%5D=3&nested%5BnestedNested%5D%5B1%5D=1');
    });

    it('does not include prototyped methods in encoded string', () => {
      function MyClass() {}
      MyClass.prototype.shouldNotBeIncluded = noop;

      expect(querystring.stringify(new MyClass())).not.toMatch(/shouldNotBeIncluded/i);
    });
  });

  describe('parse', () => {
    it('returns empty object when no query params', () => {
      expect(Object.keys(querystring.parse('https://example.com'))).toHaveLength(0);
    });

    it('does not return hash data', () => {
      expect(querystring.parse('https://example.com?var=a#something').var).toBe('a');
    });

    it('handles a querystring with multiple variables', () => {
      const actual = querystring.parse('https://example.com?var=a&var2=b#something');

      expect(actual.var).toBe('a');
      expect(actual.var2).toBe('b');
    });
  });
});
