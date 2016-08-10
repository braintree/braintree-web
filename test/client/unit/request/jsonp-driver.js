'use strict';

var JSONPDriver = require('../../../../src/client/request/jsonp-driver');
var TEST_SERVER_URL = 'http://localhost:6060/';
var querystring = require('../../../../src/lib/querystring');

function _handler(node) {
  var status, polo, timeout;
  var src = node.src;
  var params = querystring.parse(src);
  var callbackName = params.callback;

  if (/timeout/.test(src)) {
    timeout = parseInt(params.duration, 10);
    setTimeout(function () {
      global[callbackName]({status: 200});
    }, timeout);
  } else if (/marco/.test(src)) {
    polo = params.marco;
    global[callbackName]({marco: polo, status: 200});
  } else if (/return-status/.test(src)) {
    status = src.replace(/^.*\/return-status\/(\d+).*$/, '$1');
    global[callbackName]({status: parseInt(status, 10)});
  } else {
    node.onerror();
    return;
  }
}

describe('JSONPDriver', function () {
  beforeEach(function () {
    document.head.appendChild = function (node) {
      if (!(node instanceof HTMLScriptElement)) {
        return Node.prototype.appendChild.apply(document.head, arguments);
      }

      return _handler(node);
    };
  });

  afterEach(function () {
    delete document.head.appendChild;
  });

  it('accepts a timeout value which will terminate the request if it is not completed', function (done) {
    JSONPDriver.request({
      url: TEST_SERVER_URL + 'timeout',
      data: {duration: 1000},
      method: 'GET',
      timeout: 50
    }, function (err, _, status) {
      expect(err).to.exist;
      expect(err.error).to.equal('timeout');
      expect(status).to.equal(-1);
      done();
    });
  });

  describe('#request with GET', function () {
    it('makes a serialized jsonp request', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'marco',
        method: 'GET',
        data: {marco: 'polo'}
      }, function (err, resp) {
        if (err) {
          done(err);
          return;
        }

        expect(resp.marco).to.eql('polo');
        done();
      });
    });

    it('calls callback with no error if the status code is 200', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/200',
        method: 'GET'
      }, function (err) {
        expect(err).to.not.exist;
        done();
      });
    });

    it('calls callback with error if status code is 400', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/400',
        method: 'GET'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });

    it('calls callback with error if status code is 404', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/404',
        method: 'GET'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });

    it('calls callback with error if status code is 500', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/500',
        method: 'GET'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });

    it('calls callback with error when requesting a bad url', function (done) {
      JSONPDriver.request({
        url: 'this is a bogus url',
        method: 'GET'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });
  });

  describe('#request with post', function () {
    it('makes a serialized jsonp request', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'marco',
        method: 'POST',
        data: {marco: 'polo'}
      }, function (err, resp) {
        if (err) {
          done(err);
          return;
        }

        expect(resp.marco).to.eql('polo');
        done();
      });
    });

    it('calls callback with no error if the status code is 200', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/200',
        method: 'POST'
      }, function (err) {
        expect(err).to.not.exist;
        done();
      });
    });

    it('calls callback with error if status code is 400', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/400',
        method: 'POST'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });

    it('calls callback with error if status code is 404', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/404',
        method: 'POST'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });

    it('calls callback with error if status code is 500', function (done) {
      JSONPDriver.request({
        url: TEST_SERVER_URL + 'return-status/500',
        method: 'POST'
      }, function (err) {
        expect(err).to.exist;
        done();
      });
    });
  });
});
