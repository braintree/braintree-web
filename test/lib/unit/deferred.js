'use strict';

var deferred = require('../../../src/lib/deferred');

describe('deferred', function () {
  it('delays the call to the function', function (done) {
    var fn = this.sandbox.spy(function () {
      expect(arguments.length).to.equal(0);

      done();
    });
    var def = deferred(fn);

    def();

    expect(fn).not.to.have.beenCalled;
  });

  it('can pass arguments to the delayed function', function (done) {
    var fn = this.sandbox.spy(function (a, b) {
      expect(arguments.length).to.equal(2);
      expect(a).to.equal(1);
      expect(b).to.equal(2);

      done();
    });
    var def = deferred(fn);

    def(1, 2);

    expect(fn).not.to.have.beenCalled;
  });
});
