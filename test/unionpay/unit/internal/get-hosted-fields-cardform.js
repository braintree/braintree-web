'use strict';

var fake = require('../../../helpers/fake');
var composeHostedFieldsUrl = require('../../../../src/hosted-fields/external/compose-url');
var getCardForm = require('../../../../src/unionpay/internal/get-hosted-fields-cardform').get;

describe('getHostedFieldsCardForm', function () {
  beforeEach(function () {
    var assetsUrl;

    this.fakeClient = {getConfiguration: fake.configuration};
    this.fakeHostedFields = {
      _bus: {channel: 'abc123'}
    };

    this.evilFrame = {};
    Object.defineProperty(this.evilFrame, 'location', {
      get: function () {
        throw new Error('cant touch this');
      }
    });

    assetsUrl = this.fakeClient.getConfiguration().gatewayConfiguration.assetsUrl;
    this.frameUrl = composeHostedFieldsUrl(assetsUrl, 'abc123');

    this.oldParent = global.parent;
  });

  afterEach(function () {
    global.parent = this.oldParent;
  });

  it('can find the card form', function () {
    var fakeCardForm = {};
    var goodFrame = {
      location: {href: this.frameUrl},
      cardForm: fakeCardForm
    };

    global.parent = {
      frames: [
        {
          location: {href: this.frameUrl},
          cardForm: null
        },
        this.evilFrame,
        {
          location: {href: 'http://example.com'}
        },
        {
          location: {href: 'http://example.com'},
          cardForm: fakeCardForm
        },
        goodFrame,
        {
          location: {href: this.frameUrl},
          cardForm: null
        }
      ]
    };

    expect(getCardForm(this.fakeClient, this.fakeHostedFields)).to.equal(fakeCardForm);
  });

  it('returns null when it cannot find the card form', function () {
    global.parent = {
      frames: [
        {
          location: {href: this.frameUrl},
          cardForm: null
        },
        this.evilFrame,
        {
          location: {href: 'http://example.com'}
        },
        {
          location: {href: 'http://example.com'},
          cardForm: {}
        },
        {
          location: {href: this.frameUrl},
          cardForm: null
        }
      ]
    };

    expect(getCardForm(this.fakeClient, this.fakeHostedFields)).to.equal(null);
  });
});
