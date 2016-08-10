'use strict';

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
