'use strict';

var frameService = require('../../../../../src/lib/frame-service/external');
var FrameService = require('../../../../../src/lib/frame-service/external/frame-service');

describe('FrameService create', function () {
  beforeEach(function () {
    var gatewayConfiguration = {
      paypal: {
        assetsUrl: 'https://paypal.assets.url',
        displayName: 'my brand'
      }
    };

    this.state = {
      client: {
        authorization: 'fake authorization-key',
        gatewayConfiguration: gatewayConfiguration,
        getConfiguration: function () {
          return {
            gatewayConfiguration: gatewayConfiguration
          };
        }
      },
      enableShippingAddress: true,
      amount: 10.00,
      currency: 'USD',
      locale: 'en_us',
      flow: 'checkout',
      shippingAddressOverride: {
        street: '123 Townsend St'
      }
    };

    this.options = {
      state: this.state,
      name: 'fake_name',
      dispatchFrameUrl: 'fake-url',
      openFrameUrl: 'fake-frame-html'
    };
  });

  describe('create', function () {
    it('initializes a FrameService instance', function () {
      var callback = this.sandbox.stub();
      var stub = this.sandbox.stub(FrameService.prototype, 'initialize');

      frameService.create(this.options, callback);

      expect(stub).to.have.been.called;
    });
  });
});
