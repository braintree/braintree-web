'use strict';

var client = require('../../../../src/client');
var frameApi = require('../../../../src/paypal/internal/frame-api');
var constants = require('../../../../src/paypal/shared/constants');
var uuid = require('../../../../src/lib/uuid');
var BraintreeError = require('../../../../src/lib/error');

describe('frameApi', function () {
  beforeEach(function () {
    this.bus = {
      emit: this.sandbox.stub()
    };
    this.config = {
      client: {
        authorization: 'development_testing_altpay_merchant',
        gatewayConfiguration: {}
      }
    };
    this.id = uuid();

    global.opener = {
      frames: {}
    };
    global.name = constants.LANDING_FRAME_NAME + '_' + this.id;
    global.opener.frames[constants.BRIDGE_FRAME_NAME + '_' + this.id] = {
      bus: this.bus,
      configuration: this.config
    };
  });

  describe('request', function () {
    it('creates an API client', function () {
      var options = {clientOptions: this.config.client};
      var clientCreateStub = this.sandbox.stub(client, 'create');

      frameApi.request(options, function () {});

      expect(clientCreateStub.args[0][0]).to.deep.equal(this.config.client);
    });

    it('emits an error when client creation fails', function () {
      var err = new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: 'YOU_DONE_GOOFED',
        message: 'you done goofed'
      });
      var requestCallback = this.sandbox.stub();

      this.sandbox.stub(client, 'create', function (_, callback) {
        callback(err);
      });

      frameApi.request({}, requestCallback);

      expect(requestCallback).to.have.been.calledWith(err);
    });
  });

  it('sends source _meta', function () {
    var testClient = {
      request: this.sandbox.stub()
    };
    var requestOptions = {
      endpoint: 'endpoint',
      method: 'post',
      data: {}
    };

    this.sandbox.stub(client, 'create', function (_, cb) {
      cb(null, testClient);
    });

    frameApi.request(requestOptions, null);

    expect(testClient.request).to.have.been.calledWith(this.sandbox.match(function (arg) {
      return arg.data._meta.source === 'paypal';
    }));
  });
});
