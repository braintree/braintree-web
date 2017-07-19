'use strict';

var sinon = require('sinon');
var browserDetection = require('../../../../src/client/browser-detection');
var AJAXDriver = require('../../../../src/client/request/ajax-driver');
var TEST_SERVER_URL = 'http://localhost/ajax';

describe('AJAXDriver', function () {
  beforeEach(function () {
    this.server = sinon.fakeServer.create({respondImmediately: true});
  });

  afterEach(function () {
    this.server.restore();
  });

  // TODO: figure out a way to reliably test this (peridically fails as-is)
  it.skip('accepts an ajax timeout value which will terminate the request if it is not completed', function (done) {
    this.server.restore();
    this.server = sinon.fakeServer.create();
    this.server.respondWith([200, {}, '']);

    AJAXDriver.request({
      url: TEST_SERVER_URL,
      timeout: 50
    }, function callback(err) {
      expect(err).to.not.eql(null);
      done();
    });

    setTimeout(function () {
      this.server.respond();
    }.bind(this), 1000);
  });

  describe('tcp preconnect bug retry', function () {
    it('retries if a 408 error and browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(true);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(408, {}, '');
          return;
        }

        req.respond(200, {}, '{"result": "yay"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err, data, status) {
        expect(err).to.not.exist;
        expect(status).to.equal(200);
        expect(data).to.deep.equal({result: 'yay'});
        done();
      });
    });

    it('retries if a status code is 0 and browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(true);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(0, {}, '');
          return;
        }

        req.respond(200, {}, '{"result": "yay"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err, data, status) {
        expect(err).to.not.exist;
        expect(status).to.equal(200);
        expect(data).to.deep.equal({result: 'yay'});
        done();
      });
    });

    it('only retries once if status is 408 and browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(true);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(408, {}, 'first');
          return;
        } else if (responseCount === 1) {
          responseCount++;
          req.respond(408, {}, 'second');
          return;
        }

        req.respond(200, {}, '{"never": "gets here"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err, data, status) {
        expect(err).to.equal('second');
        expect(status).to.equal(408);
        expect(data).to.not.exist;
        done();
      });
    });

    it('only retries for 408 if browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(false);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(408, {}, 'error');
          return;
        }

        req.respond(200, {}, '{"result": "yay"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err, data, status) {
        expect(err).to.equal('error');
        expect(status).to.equal(408);
        expect(data).to.not.exist;
        done();
      });
    });
  });

  describe('#request with get', function () {
    it('makes an serialized ajax request', function (done) {
      this.server.respondWith([200, {}, JSON.stringify({marco: 'polo'})]);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err, resp) {
        if (err) {
          done(err);
          return;
        }

        expect(resp.marco).to.eql('polo');
        done();
      });
    });

    it('calls callback with error if request is unsuccessful', function (done) {
      this.server.respondWith([500, {}, '']);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err) {
        expect(err).to.not.eql(null);
        done();
      });
    });

    it('calls callback with error if request is rate limited', function (done) {
      var body = '<!doctype html><html></html>';

      this.server.respondWith([429, {'Content-Type': 'text/html'}, body]);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET'
      }, function callback(err, res, status) {
        expect(status).to.equal(429);
        expect(res).to.be.null;
        expect(err).to.eql(body);
        done();
      });
    });
  });

  describe('#request with post', function () {
    it('makes a serialized ajax request', function (done) {
      this.server.respondWith([200, {}, JSON.stringify({marco: 'polo'})]);

      AJAXDriver.request({
        url: TEST_SERVER_URL + 'marco',
        data: {marco: 'polo'},
        method: 'POST'
      }, function callback(err, resp) {
        if (err) {
          done(err);
          return;
        }

        expect(resp.marco).to.eql('polo');
        done();
      });
    });

    it('sets the Content-Type header to application/json', function () {
      this.sandbox.stub(XMLHttpRequest.prototype, 'setRequestHeader');

      AJAXDriver.request({
        url: TEST_SERVER_URL + 'marco',
        data: {marco: 'polo'},
        method: 'POST'
      }, function () {});

      expect(XMLHttpRequest.prototype.setRequestHeader).to.be.calledWith('Content-Type', 'application/json');
    });

    it('sets the headers if provided and XHR is available', function () {
      this.sandbox.stub(XMLHttpRequest.prototype, 'setRequestHeader');

      AJAXDriver.request({
        url: TEST_SERVER_URL + 'marco',
        data: {marco: 'polo'},
        headers: {
          Foo: 'foo',
          Bar: 'bar'
        },
        method: 'POST'
      }, function () {});

      expect(XMLHttpRequest.prototype.setRequestHeader).to.be.calledWith('Foo', 'foo');
      expect(XMLHttpRequest.prototype.setRequestHeader).to.be.calledWith('Bar', 'bar');
    });

    it('calls callback with error if request is unsuccessful', function (done) {
      this.server.respondWith([500, {}, '']);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'POST'
      }, function callback(err) {
        expect(err).to.not.eql(null);
        done();
      });
    });
  });
});
