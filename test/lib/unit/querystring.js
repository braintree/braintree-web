'use strict';

var querystring = require('../../../src/lib/querystring');

describe('querystring', function () {
  describe('createURLParams', function () {
    it('returns an unmodified url if no params are given', function () {
      var url = 'http://httpbin.org/ip';

      expect(querystring.queryify(url)).to.equal(url);
    });

    it('returns an unmodified url if given an empty params object', function () {
      var url = 'http://httpbin.org/ip';

      expect(querystring.queryify(url, {})).to.equal(url);
    });

    it('returns a url with params', function () {
      var url = 'http://httpbin.org/ip';
      var params = {foo: 'bar', baz: 'qux'};

      expect(querystring.queryify(url, params)).to.equal(url + '?foo=bar&baz=qux');
    });

    it('returns a url with params if given a nested params object', function () {
      var url = 'http://httpbin.org/ip';
      var params = {foo: {bar: {baz: 'qux'}}};

      expect(querystring.queryify(url, params)).to.equal(url + encodeURI('?foo[bar][baz]=qux'));
    });

    it('returns query params if no url is given', function () {
      var url;
      var params = {foo: 'bar', baz: 'qux'};

      expect(querystring.queryify(url, params)).to.equal('?foo=bar&baz=qux');
    });

    it('returns query params if url is "?"', function () {
      var url = '?';
      var params = {foo: 'bar', baz: 'qux'};

      expect(querystring.queryify(url, params)).to.equal(url + 'foo=bar&baz=qux');
    });

    it('returns query params appended if url already has query params', function () {
      var url = '?oogle=foogle';
      var params = {foo: 'bar', baz: 'qux'};

      expect(querystring.queryify(url, params)).to.equal(url + '&foo=bar&baz=qux');
    });

    it('returns unmodified url if invalid params are passed', function () {
      var url = 'http://httpbin.org/ip';

      expect(querystring.queryify(url, 1)).to.equal(url);
      expect(querystring.queryify(url, null)).to.equal(url);
      expect(querystring.queryify(url, '')).to.equal(url);
      expect(querystring.queryify(url)).to.equal(url);
    });
  });

  describe('stringify', function () {
    it('turns an object into a GET string', function () {
      var params = {hello: '1', world: 'some string', integer: 1, dbl: 2.0};
      var result = querystring.stringify(params);

      expect(result).to.eql('hello=1&world=some%20string&integer=1&dbl=2');
    });

    it('encodes an array as a url encoded string', function () {
      var params = {
        myArray: [
          0,
          'second',
          {ordinal: 'third'}
        ]
      };
      var result = querystring.stringify(params);
      var expected = 'myArray%5B%5D=0&myArray%5B%5D=second&myArray%5B%5D%5Bordinal%5D=third';

      expect(result).to.eql(expected);
    });

    it('encodes a nested object as a url encoded string', function () {
      var params = {
        topLevel: '1',
        nested: {
          hello: '2',
          world: '3',
          nestedNested: {
            1: '1'
          }
        }
      };
      var result = querystring.stringify(params);
      var expected = 'topLevel=1&nested%5Bhello%5D=2&nested%5Bworld%5D=3&nested%5BnestedNested%5D%5B1%5D=1';

      expect(result).to.eql(expected);
    });

    it('does not include prototyped methods in encoded string', function () {
      var result;

      function MyClass() {}
      MyClass.prototype.shouldNotBeIncluded = function () {};

      result = querystring.stringify(new MyClass());

      expect(result).to.not.match(/shouldNotBeIncluded/i);
    });
  });

  describe('parse', function () {
    it('returns empty object when no query params', function () {
      var actual = querystring.parse('https://example.com');

      expect(actual).to.be.empty;
    });

    it('does not return hash data', function () {
      var actual = querystring.parse('https://example.com?var=a#something');

      expect(actual.var).to.equal('a');
    });

    it('handles a querystring with multiple variables', function () {
      var actual = querystring.parse('https://example.com?var=a&var2=b#something');

      expect(actual.var).to.equal('a');
      expect(actual.var2).to.equal('b');
    });
  });
});
