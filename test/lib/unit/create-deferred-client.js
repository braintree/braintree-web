'use strict';

var assets = require('../../../src/lib/assets');
var Promise = require('../../../src/lib/promise');
var create = require('../../../src/lib/create-deferred-client').create;
var BraintreeError = require('../../../src/lib/braintree-error');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var fake = require('../../helpers/fake');

var VERSION = process.env.npm_package_version;

describe('createDeferredClient', function () {
  beforeEach(function () {
    this.fakeClient = fake.client();
    this.fakeClientCreate = this.sandbox.stub().resolves(this.fakeClient);
    this.auth = fake.clientToken;

    global.braintree = {
      client: {
        VERSION: VERSION,
        create: this.fakeClientCreate
      }
    };

    this.sandbox.stub(assets, 'loadScript').callsFake(function () {
      global.braintree = {
        client: {
          VERSION: VERSION,
          create: this.fakeClientCreate
        }
      };

      return Promise.resolve();
    }.bind(this));
  });

  afterEach(function () {
    delete global.braintree;
  });

  it('resolves with client if a client is passed in', function () {
    var fakeClient = {};

    return create({
      client: fakeClient
    }).then(function (client) {
      expect(client).to.equal(fakeClient);
    });
  });

  it('resolves with a client after loading client asset script', function () {
    delete global.braintree.client;

    return create({
      name: 'Some Component',
      assetsUrl: 'https://example.com/foo',
      authorization: this.auth
    }).then(function (client) {
      expect(assets.loadScript).to.be.calledOnce;

      expect(client).to.equal(this.fakeClient);
    }.bind(this));
  });

  it('resolves with a client without loading client asset script', function () {
    return create({
      name: 'Some Component',
      assetsUrl: 'https://example.com/foo',
      authorization: this.auth
    }).then(function (client) {
      expect(assets.loadScript).to.not.be.called;

      expect(client).to.equal(this.fakeClient);
    }.bind(this));
  });

  it('loads client script if there is no braintree.client object on the window', function () {
    delete global.braintree.client;

    return create({
      name: 'Some Component',
      assetsUrl: 'https://example.com/foo',
      authorization: this.auth
    }).then(function () {
      expect(assets.loadScript).to.be.calledOnce;
      expect(assets.loadScript).to.be.calledWith({
        src: 'https://example.com/foo/web/' + VERSION + '/js/client.min.js'
      });
    });
  });

  it('rejects if the client version on the window does not match the component version', function () {
    global.braintree.client.VERSION = '1.2.3';

    return create({
      name: 'Some Component'
    }).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.code).to.equal('INCOMPATIBLE_VERSIONS');
      expect(err.message).to.equal('Client (version 1.2.3) and Some Component (version ' + VERSION + ') components must be from the same SDK version.');
    });
  });

  it('calls braintree.client.create on existing window object if it exists', function () {
    return create({
      name: 'Some Component',
      authorization: this.auth,
      debug: false
    }).then(function () {
      expect(assets.loadScript).to.not.be.called;
      expect(this.fakeClientCreate).to.be.calledOnce;
      expect(this.fakeClientCreate).to.be.calledWith({
        authorization: this.auth,
        debug: false
      });
    }.bind(this));
  });

  it('passes along debug value', function () {
    return create({
      name: 'Some Component',
      authorization: this.auth,
      debug: true
    }).then(function () {
      expect(this.fakeClientCreate).to.be.calledOnce;
      expect(this.fakeClientCreate).to.be.calledWith({
        authorization: this.auth,
        debug: true
      });
    }.bind(this));
  });

  it('rejects if asset loader rejects', function () {
    var error = new Error('failed!');

    delete global.braintree;
    assets.loadScript.rejects(error);

    return create({
      name: 'Some Component',
      authorization: this.auth
    }).then(rejectIfResolves).catch(function (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.code).to.equal('CLIENT_SCRIPT_FAILED_TO_LOAD');
      expect(err.details.originalError).to.equal(error);
    });
  });

  it('rejects if braintree.client.create rejects', function () {
    var error = new Error('failed!');

    this.fakeClientCreate.rejects(error);

    return create({
      name: 'Some Component',
      authorization: this.auth
    }).then(rejectIfResolves).catch(function (err) {
      expect(err).to.equal(error);
    });
  });
});
