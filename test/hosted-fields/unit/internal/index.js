/* eslint-disable camelcase */

'use strict';

var internal = require('../../../../src/hosted-fields/internal/index');
var Promise = require('../../../../src/lib/promise');
var getFrameName = require('../../../../src/hosted-fields/internal/get-frame-name');
var events = require('../../../../src/hosted-fields/shared/constants').events;
var CreditCardForm = require('../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var analytics = require('../../../../src/lib/analytics');
var fake = require('../../../helpers/fake');
var assembleIFrames = require('../../../../src/hosted-fields/internal/assemble-iframes');
var BraintreeError = require('../../../../src/lib/braintree-error');

describe('internal', function () {
  beforeEach(function () {
    location.hash = 'fake-channel';

    this.fakeConfig = {
      fields: {
        number: {},
        cvv: {}
      },
      orderedFields: ['number', 'cvv']
    };
    this.cardForm = new CreditCardForm(this.fakeConfig);
    this.sandbox.stub(getFrameName, 'getFrameName');
  });

  describe('initialize', function () {
    context('text inputs', function () {
      beforeEach(function () {
        getFrameName.getFrameName.returns('cvv');
        internal.initialize(this.cardForm);
      });

      it('creates an input element', function () {
        var input = document.getElementById('cvv');

        expect(input.tagName).to.equal('INPUT');
      });

      it('sets up autofill inputs for number input', function () {
        var cvv, expMonth, expYear;

        document.body.innerHTML = ''; // reset from beforeEach

        getFrameName.getFrameName.returns('number');
        internal.initialize(this.cardForm);

        cvv = document.querySelector('#cvv-autofill-field');
        expMonth = document.querySelector('#expiration-month-autofill-field');
        expYear = document.querySelector('#expiration-year-autofill-field');

        expect(cvv).to.exist;
        expect(expMonth).to.exist;
        expect(expYear).to.exist;
        expect(cvv.autocomplete).to.equal('cc-csc');
        expect(expMonth.autocomplete).to.equal('cc-exp-month');
        expect(expYear.autocomplete).to.equal('cc-exp-year');
      });

      it('makes the input have a transparent background', function () {
        var input = document.getElementById('cvv');
        var background = window.getComputedStyle(input, null).getPropertyValue('background-color');

        expect(background.replace(/\s/g, '')).to.equal('rgba(0,0,0,0)');
      });

      it('gives the input a class of the proper type', function () {
        var input = document.getElementById('cvv');

        expect(input.classList.contains('cvv')).to.be.true;
      });

      it('triggers events on the bus when events occur', function () {
        var input = document.getElementById('cvv');

        this.sandbox.stub(CreditCardForm.prototype, 'emitEvent');

        triggerEvent('focus', input);
        triggerEvent('blur', input);
        triggerEvent('click', input);  // not allowed
        triggerEvent('keyup', input);  // not allowed

        expect(CreditCardForm.prototype.emitEvent).to.be.calledWith('cvv', 'focus');
        expect(CreditCardForm.prototype.emitEvent).to.be.calledWith('cvv', 'blur');
        expect(CreditCardForm.prototype.emitEvent).not.to.be.calledWith('cvv', 'click');
        expect(CreditCardForm.prototype.emitEvent).not.to.be.calledWith('cvv', 'keyup');
      });
    });

    context('mobile tab targets', function () {
      beforeEach(function () {
        getFrameName.getFrameName.returns('number');
        internal.initialize(this.cardForm);
        getFrameName.getFrameName.returns('cvv');
        internal.initialize(this.cardForm);
      });

      it('does not create a "prev" tab target in the first field\'s form', function () {
        var inputs = document.forms[0].getElementsByTagName('input');
        var length = inputs.length;

        while (length--) {
          expect(inputs.item(length).id).not.to.contain('prev');
        }
      });

      it('creates a next input at the end of the first field\'s form', function () {
        var inputs = document.forms[0].getElementsByTagName('input');
        var lastInput = inputs[inputs.length - 1];

        expect(lastInput.id).to.contain('next');
      });

      it('creates a previous input at the beginning of the last field\'s form', function () {
        var forms = document.forms;
        var firstInput = forms[forms.length - 1].getElementsByTagName('input')[0];

        expect(firstInput.id).to.contain('prev');
      });

      it('creates a submit instead of text input at the end of the last field\'s form', function () {
        var forms = document.forms;
        var inputs = forms[forms.length - 1].getElementsByTagName('input');
        var lastInput = inputs[inputs.length - 1];

        expect(lastInput.getAttribute('type')).to.be.string('submit');
      });

      it('fires the correct focus event when tabbing between fields', function () {
        document.querySelector('input[id*="target"]').focus();

        expect(global.bus.emit).to.be.calledWith(events.TRIGGER_INPUT_FOCUS, this.sandbox.match.string);
      });
    });
  });

  describe('create', function () {
    it('creates a global bus', function () {
      var originalLocationHash = location.hash;

      location.hash = '#test-uuid';
      internal.create();
      expect(global.bus.channel).to.equal('test-uuid');

      location.hash = originalLocationHash;
    });

    it('emits that the frame is ready', function () {
      getFrameName.getFrameName.returns('cvv');
      internal.create();

      expect(global.bus.emit).to.be.calledOnce;
      expect(global.bus.emit).to.be.calledWith(events.FRAME_READY, {
        field: 'cvv'
      }, this.sandbox.match.func);
    });
  });

  describe('orchestrate', function () {
    afterEach(function () {
      delete global.cardForm;
    });

    context('supporting card types', function () {
      it('calls CreditCardForm with supportedCardTypes', function () {
        var config = {
          client: fake.configuration(),
          fields: {
            number: {selector: '#foo'},
            cvv: {selector: '#boo'},
            postalCode: {selector: '#you'}
          },
          supportedCardTypes: ['MasterCard']
        };

        this.sandbox.stub(analytics, 'sendEvent');
        this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

        internal.orchestrate(config);

        expect(global.cardForm.supportedCardTypes).to.be.not.undefined;
      });

      it('sets supported card types asyncronously', function () {
        var config = {
          fields: {
            number: {selector: '#foo', rejectUnsupportedCards: true},
            cvv: {selector: '#boo'},
            postalCode: {selector: '#you'}
          }
        };

        global.bus.emit.withArgs(events.READY_FOR_CLIENT).yieldsAsync(fake.configuration());
        this.sandbox.spy(CreditCardForm.prototype, 'setSupportedCardTypes');
        this.sandbox.stub(CreditCardForm.prototype, 'validateField');
        this.sandbox.stub(analytics, 'sendEvent');
        this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

        return internal.orchestrate(config).then(function () {
          expect(CreditCardForm.prototype.validateField).to.be.calledOnce;
          expect(CreditCardForm.prototype.validateField).to.be.calledWith('number');
          expect(CreditCardForm.prototype.setSupportedCardTypes).to.be.calledTwice;
          expect(CreditCardForm.prototype.setSupportedCardTypes).to.be.calledWith(this.sandbox.match.typeOf('undefined')); // on initialization
          // when client is ready
          expect(CreditCardForm.prototype.setSupportedCardTypes).to.be.calledWith([
            'American Express',
            'Discover',
            'Visa'
          ]);
        }.bind(this));
      });

      it('does not call set supported card types an additional time if rejectUnsupportedCards is not set', function () {
        var config = {
          fields: {
            number: {selector: '#foo'},
            cvv: {selector: '#boo'},
            postalCode: {selector: '#you'}
          }
        };

        global.bus.emit.withArgs(events.READY_FOR_CLIENT).yieldsAsync(fake.configuration());
        this.sandbox.spy(CreditCardForm.prototype, 'setSupportedCardTypes');
        this.sandbox.stub(analytics, 'sendEvent');
        this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

        return internal.orchestrate(config).then(function () {
          expect(CreditCardForm.prototype.setSupportedCardTypes).to.be.calledOnce;
          expect(CreditCardForm.prototype.setSupportedCardTypes).to.be.calledOnce;
        });
      });

      it('does not call set supported card types an additional time if number field is not provided', function () {
        var config = {
          fields: {
            cvv: {selector: '#boo'},
            postalCode: {selector: '#you'}
          }
        };

        global.bus.emit.withArgs(events.READY_FOR_CLIENT).yieldsAsync(fake.configuration());
        this.sandbox.spy(CreditCardForm.prototype, 'setSupportedCardTypes');
        this.sandbox.stub(analytics, 'sendEvent');
        this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

        return internal.orchestrate(config).then(function () {
          expect(CreditCardForm.prototype.setSupportedCardTypes).to.be.calledOnce;
        });
      });
    });

    it('posts an analytics event', function () {
      this.sandbox.stub(analytics, 'sendEvent');
      this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

      internal.orchestrate({
        client: fake.configuration(),
        fields: {
          number: {selector: '#foo'},
          cvv: {selector: '#boo'},
          postalCode: {selector: '#you'}
        }
      });

      expect(analytics.sendEvent).to.be.calledWith(this.sandbox.match.object, 'custom.hosted-fields.load.succeeded');
    });

    it('calls initialize on each frame that has an initalize function', function () {
      var frame1 = {
        braintree: {
          hostedFields: {
            initialize: this.sandbox.stub()
          }
        }
      };
      var frame2 = {
        braintree: {
          hostedFields: {
            initialize: this.sandbox.stub()
          }
        }
      };
      var frameWithoutInitialize = {
        braintree: {
          hostedFields: {
          }
        }
      };
      var frameWithoutBraintreeGlobal = {
      };

      this.sandbox.stub(analytics, 'sendEvent');
      this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([
        frame1,
        frameWithoutInitialize,
        frameWithoutBraintreeGlobal,
        frame2
      ]);

      internal.orchestrate({
        client: fake.configuration(),
        fields: {
          number: {selector: '#foo'},
          cvv: {selector: '#boo'},
          postalCode: {selector: '#you'}
        }
      });

      expect(frame1.braintree.hostedFields.initialize).to.be.calledOnce;
      expect(frame1.braintree.hostedFields.initialize).to.be.calledWith(this.sandbox.match.instanceOf(CreditCardForm));
      expect(frame2.braintree.hostedFields.initialize).to.be.calledOnce;
      expect(frame2.braintree.hostedFields.initialize).to.be.calledWith(this.sandbox.match.instanceOf(CreditCardForm));
    });

    it('sets up a tokenization handler', function () {
      this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

      internal.orchestrate({
        client: fake.configuration(),
        fields: {
          number: {selector: '#foo'},
          cvv: {selector: '#boo'},
          postalCode: {selector: '#you'}
        }
      });

      expect(global.bus.on).to.be.calledOnce;
      expect(global.bus.on).to.be.calledWith(events.TOKENIZATION_REQUEST, this.sandbox.match.func);
    });

    it('sets up a global card form', function () {
      expect(global.cardForm).to.not.exist;

      this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

      internal.orchestrate({
        client: fake.configuration(),
        fields: {
          number: {selector: '#foo'},
          cvv: {selector: '#boo'},
          postalCode: {selector: '#you'}
        }
      });

      expect(global.cardForm).to.be.an.instanceof(CreditCardForm);
    });

    it('creates a client initialization promise', function () {
      global.bus.emit.withArgs(events.READY_FOR_CLIENT).yieldsAsync(fake.configuration());
      this.sandbox.stub(assembleIFrames, 'assembleIFrames').returns([]);

      internal.orchestrate({
        fields: {
          number: {selector: '#foo'},
          cvv: {selector: '#boo'},
          postalCode: {selector: '#you'}
        }
      });

      expect(global.bus.emit.withArgs(events.READY_FOR_CLIENT)).to.be.calledOnce;
    });
  });

  describe('createTokenizationHandler', function () {
    var create = internal.createTokenizationHandler;

    beforeEach(function () {
      var self = this;
      var requestStub = this.sandbox.stub();

      this.fakeNonce = 'nonce homeboy';
      this.fakeDetails = 'yas';
      this.fakeType = 'YASS';
      this.fakeDescription = 'fake description';
      this.fakeOptions = {foo: 'bar'};
      this.binData = {commercial: 'Yes'};

      requestStub.resolves({
        creditCards: [{
          nonce: self.fakeNonce,
          details: self.fakeDetails,
          description: self.fakeDescription,
          type: self.fakeType,
          foo: 'bar',
          binData: self.binData
        }]
      });

      this.fakeError = new Error('you done goofed');

      this.fakeError.errors = [];
      this.fakeError.details = {
        httpStatus: 500
      };

      this.sandbox.stub(analytics, 'sendEvent');

      this.details = {
        isValid: true,
        isEmpty: false,
        someOtherStuff: null
      };

      this.configuration = fake.configuration();

      this.goodClient = {
        getConfiguration: function () {
          return self.configuration;
        },
        request: requestStub
      };

      this.badClient = {
        getConfiguration: function () {
          return self.configuration;
        },
        request: this.sandbox.stub().rejects(self.fakeError)
      };

      this.emptyCardForm = this.cardForm;
      this.emptyCardForm.isEmpty = function () { return true; };

      this.validCardForm = new CreditCardForm(this.fakeConfig);
      this.validCardForm.isEmpty = function () { return false; };
      this.validCardForm.invalidFieldKeys = function () { return []; };

      this.invalidCardForm = new CreditCardForm(this.fakeConfig);
      this.invalidCardForm.isEmpty = function () { return false; };
      this.invalidCardForm.invalidFieldKeys = function () { return ['cvv']; };
    });

    it('returns a function', function () {
      expect(create(this.goodClient, this.cardForm)).to.be.a('function');
    });

    it('replies with an error if tokenization fails due to network', function (done) {
      create(this.badClient, this.validCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR');
        expect(err.message).to.equal('A tokenization network error occurred.');
        expect(err.details.originalError.message).to.equal('you done goofed');
        expect(err.details.originalError.errors).to.equal(this.fakeError.errors);

        done();
      }.bind(this));
    });

    it('replies with client\'s error if tokenization fails due to authorization', function (done) {
      this.fakeError.details.httpStatus = 403;
      this.badClient.request.rejects(this.fakeError);

      create(this.badClient, this.validCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.equal(this.fakeError);

        done();
      }.bind(this));
    });

    it('replies with an error if tokenization fails due to card data', function (done) {
      this.fakeError.details.httpStatus = 422;
      this.badClient.request.rejects(this.fakeError);

      create(this.badClient, this.validCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_FAILED_TOKENIZATION');
        expect(err.message).to.equal('The supplied card data failed tokenization.');
        expect(err.details.originalError.message).to.equal('you done goofed');
        expect(err.details.originalError.errors).to.equal(this.fakeError.errors);

        done();
      }.bind(this));
    });

    it('sends an analytics event if tokenization fails', function (done) {
      create(this.badClient, this.validCardForm)(this.fakeOptions, function () {
        expect(analytics.sendEvent).to.be.calledWith(this.badClient, 'custom.hosted-fields.tokenization.failed');

        done();
      }.bind(this));
    });

    it('replies with data if Client API tokenization succeeds', function (done) {
      create(this.goodClient, this.validCardForm)(this.fakeOptions, function (arg) {
        expect(arg).to.deep.equal([null, {
          nonce: this.fakeNonce,
          details: this.fakeDetails,
          description: this.fakeDescription,
          type: this.fakeType,
          binData: this.binData
        }]);

        done();
      }.bind(this));
    });

    it('sends an analytics event if tokenization succeeds', function (done) {
      create(this.goodClient, this.validCardForm)(this.fakeOptions, function () {
        expect(analytics.sendEvent).to.be.calledWith(this.goodClient, 'custom.hosted-fields.tokenization.succeeded');

        done();
      }.bind(this));
    });

    it('replies with an error if all fields are empty', function (done) {
      create(this.goodClient, this.emptyCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELDS_EMPTY');
        expect(err.message).to.equal('All fields are empty. Cannot tokenize empty card fields.');
        expect(err.details).not.to.exist;

        done();
      });
    });

    it('replies with an error when some fields are invalid', function (done) {
      create(this.goodClient, this.invalidCardForm)(this.fakeOptions, function (response) {
        var err = response[0];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_FIELDS_INVALID');
        expect(err.message).to.equal('Some payment input fields are invalid. Cannot tokenize invalid card fields.');
        expect(err.details).to.deep.equal({
          invalidFieldKeys: ['cvv']
        });

        done();
      });
    });

    it('passes in fieldsToTokenize option to card form', function (done) {
      var fields = ['number', 'cvv'];
      var invalidFieldKeys = this.sandbox.spy(this.validCardForm, 'invalidFieldKeys');
      var getCardData = this.sandbox.spy(this.validCardForm, 'getCardData');
      var isEmpty = this.sandbox.spy(this.validCardForm, 'isEmpty');

      this.fakeOptions.fieldsToTokenize = fields;

      create(this.goodClient, this.validCardForm)(this.fakeOptions, function () {
        expect(invalidFieldKeys).to.be.calledOnce;
        expect(invalidFieldKeys).to.be.calledWith(fields);
        expect(getCardData).to.be.calledOnce;
        expect(getCardData).to.be.calledWith(fields);
        expect(isEmpty).to.be.calledOnce;
        expect(isEmpty).to.be.calledWith(fields);

        done();
      });
    });

    it('makes a client request with validate false if the vault option is not provided', function (done) {
      create(this.goodClient, this.validCardForm)(this.fakeOptions, function () {
        expect(this.goodClient.request).to.be.calledWithMatch({
          data: {
            creditCard: {
              options: {
                validate: false
              }
            }
          }
        });
        done();
      }.bind(this));
    });

    it('makes a client request without validate false if the vault option is not provided', function (done) {
      create(this.goodClient, this.validCardForm)({vault: true}, function () {
        expect(this.goodClient.request).not.to.be.calledWithMatch({
          data: {
            creditCard: {
              options: {
                validate: false
              }
            }
          }
        });
        done();
      }.bind(this));
    });

    context('when supplying additional data', function () {
      beforeEach(function () {
        var fakeConfigWithPostalCode = {
          fields: {
            number: {},
            postalCode: {}
          }
        };

        this.cardFormWithPostalCode = new CreditCardForm(fakeConfigWithPostalCode);
        this.cardFormWithPostalCode.isEmpty = function () { return false; };
        this.cardFormWithPostalCode.invalidFieldKeys = function () { return []; };

        this.fakeOptions = {};
      });

      it('tokenizes with additional cardholder name', function (done) {
        this.fakeOptions.cardholderName = 'First Last';

        create(this.goodClient, this.validCardForm)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                cardholderName: 'First Last'
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes street address', function (done) {
        this.fakeOptions.billingAddress = {
          streetAddress: '606 Elm St'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  street_address: '606 Elm St'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes extended address', function (done) {
        this.fakeOptions.billingAddress = {
          extendedAddress: 'Unit 1'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  extended_address: 'Unit 1'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes locality', function (done) {
        this.fakeOptions.billingAddress = {
          locality: 'Chicago'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  locality: 'Chicago'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes region', function (done) {
        this.fakeOptions.billingAddress = {
          region: 'IL'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  region: 'IL'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes first name', function (done) {
        this.fakeOptions.billingAddress = {
          firstName: 'First'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  first_name: 'First'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes last name', function (done) {
        this.fakeOptions.billingAddress = {
          lastName: 'Last'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  last_name: 'Last'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes company', function (done) {
        this.fakeOptions.billingAddress = {
          company: 'Company'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  company: 'Company'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes country name', function (done) {
        this.fakeOptions.billingAddress = {
          countryName: 'United States'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  country_name: 'United States'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes country code alpha 2', function (done) {
        this.fakeOptions.billingAddress = {
          countryCodeAlpha2: 'US'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  country_code_alpha2: 'US'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes country code alpha 3', function (done) {
        this.fakeOptions.billingAddress = {
          countryCodeAlpha3: 'USA'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  country_code_alpha3: 'USA'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes numeric country code', function (done) {
        this.fakeOptions.billingAddress = {
          countryCodeNumeric: '840'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  country_code_numeric: '840'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes with additional postal code data when Hosted Fields has no postal code field', function (done) {
        this.fakeOptions.billingAddress = {
          postalCode: '33333'
        };

        create(this.goodClient, this.validCardForm)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  postal_code: '33333'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('tokenizes with Hosted Fields postal code', function (done) {
        this.cardFormWithPostalCode.set('postalCode.value', '11111');

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  postal_code: '11111'
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('prioritizes Hosted Fields postal code even when the field is empty', function (done) {
        this.fakeOptions.billingAddress = {
          postalCode: '33333'
        };

        this.cardFormWithPostalCode.set('postalCode.value', '');

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                billing_address: {
                  postal_code: ''
                }
              }
            }
          });

          done();
        }.bind(this));
      });

      it('does not override other parts of the form with options', function (done) {
        this.fakeOptions.number = '3333 3333 3333 3333';

        this.cardFormWithPostalCode.set('number.value', '1111111111111111');

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          expect(this.goodClient.request).to.be.calledWithMatch({
            api: 'clientApi',
            data: {
              creditCard: {
                number: '1111111111111111'
              }
            }
          });

          done();
        }.bind(this));
      });

      it('does not attempt to tokenize non-allowed billing address options', function (done) {
        this.cardFormWithPostalCode.set('number.value', '1111 1111 1111 1111');
        this.fakeOptions.billingAddress = {
          foo: 'bar',
          baz: 'biz'
        };

        create(this.goodClient, this.cardFormWithPostalCode)(this.fakeOptions, function () {
          var clientApiRequestArgs = this.goodClient.request.args[0][0];

          expect(clientApiRequestArgs.data.creditCard.billing_address.foo).to.not.exist;
          expect(clientApiRequestArgs.data.creditCard.billing_address.baz).to.not.exist;

          done();
        }.bind(this));
      });
    });

    it('sends Client API error when Client API fails', function (done) {
      var fakeErr = new Error('it failed');

      fakeErr.details = {httpStatus: 500};

      this.goodClient.request = this.sandbox.stub().rejects(fakeErr);

      create(this.goodClient, this.validCardForm)(this.fakeOptions, function (args) {
        var err = args[0];
        var result = args[1];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR');
        expect(err.message).to.equal('A tokenization network error occurred.');
        expect(err.details.originalError).to.equal(fakeErr);

        expect(result).not.to.exist;

        done();
      });
    });

    it('sends a wrapped fail on duplicate payment method error', function (done) {
      var originalError = {
        fieldErrors: [{
          fieldErrors: [{
            code: '81724',
            field: 'creditCard',
            message: 'Already in vault'
          }]
        }]
      };
      var fakeErr = new BraintreeError({
        code: 'CLIENT_REQUEST_ERROR',
        type: BraintreeError.types.NETWORK,
        message: 'An error',
        details: {
          httpStatus: 422,
          originalError: originalError
        }
      });

      this.goodClient.request = this.sandbox.stub().rejects(fakeErr);

      create(this.goodClient, this.validCardForm)(this.fakeOptions, function (args) {
        var err = args[0];
        var result = args[1];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_TOKENIZATION_FAIL_ON_DUPLICATE');
        expect(err.message).to.equal('This credit card already exists in the merchant\'s vault.');
        expect(err.details.originalError).to.equal(originalError);

        expect(result).not.to.exist;

        done();
      });
    });

    it('sends a wrapped cvv verification error', function (done) {
      var originalError = {
        fieldErrors: [{
          fieldErrors: [{
            code: '81736',
            field: 'cvv',
            message: 'cvv verification failed'
          }]
        }]
      };
      var fakeErr = new BraintreeError({
        code: 'CLIENT_REQUEST_ERROR',
        type: BraintreeError.types.NETWORK,
        message: 'An error',
        details: {
          httpStatus: 422,
          originalError: originalError
        }
      });

      this.goodClient.request = this.sandbox.stub().rejects(fakeErr);

      create(this.goodClient, this.validCardForm)(this.fakeOptions, function (args) {
        var err = args[0];
        var result = args[1];

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('HOSTED_FIELDS_TOKENIZATION_CVV_VERIFICATION_FAILED');
        expect(err.message).to.equal('CVV verification failed during tokenization.');
        expect(err.details.originalError).to.equal(originalError);

        expect(result).not.to.exist;

        done();
      });
    });

    it('can take a client initialization promise to defer the request until the client is ready', function (done) {
      var clock = this.sandbox.useFakeTimers();
      var client = this.goodClient;
      var clientPromise = new Promise(function (resolve) {
        setTimeout(function () {
          resolve(client);
        }, 1000);
      });

      create(clientPromise, this.validCardForm)(this.fakeOptions, function (arg) {
        expect(client.request).to.be.calledOnce;
        expect(arg).to.deep.equal([null, {
          nonce: this.fakeNonce,
          details: this.fakeDetails,
          description: this.fakeDescription,
          type: this.fakeType,
          binData: this.binData
        }]);

        done();
      }.bind(this));

      clock.tick(950);

      expect(client.request).to.not.be.called;

      clock.tick(100);
    });
  });

  describe('autofillHandler', function () {
    beforeEach(function () {
      getFrameName.getFrameName.returns('cvv');
      this.fieldComponent = {
        input: {
          maskValue: this.sandbox.stub(),
          updateModel: this.sandbox.stub(),
          element: {
            value: '',
            getAttribute: this.sandbox.stub(),
            setAttribute: this.sandbox.stub()
          }
        }
      };
    });

    it('returns a function', function () {
      expect(internal.autofillHandler(this.fieldComponent)).to.be.a('function');
    });

    it('returns early if there is no payload', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      handler();
      expect(getFrameName.getFrameName).to.not.be.called;
    });

    it('returns early if payload does not contain a month', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      handler({
        year: '2020'
      });
      expect(getFrameName.getFrameName).to.not.be.called;
    });

    it('returns early if payload does not contain a year', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      handler({
        month: '12'
      });
      expect(getFrameName.getFrameName).to.not.be.called;
    });

    it('noops if input is not an expiration field', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('postalCode');

      handler({
        month: '12',
        year: '2020'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.not.be.called;
    });

    it('updates input with month and year if frame is expiration date', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('expirationDate');

      handler({
        month: '12',
        year: '2020'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.be.calledOnce;
      expect(this.fieldComponent.input.updateModel).to.be.calledWith('value', '12 / 2020');
      expect(this.fieldComponent.input.element.value).to.equal('12 / 2020');
    });

    it('masks input if masking is turned on', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      this.fieldComponent.input.shouldMask = true;

      getFrameName.getFrameName.returns('expirationDate');

      handler({
        month: '12',
        year: '2020'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.be.calledOnce;
      expect(this.fieldComponent.input.updateModel).to.be.calledWith('value', '12 / 2020');
      expect(this.fieldComponent.input.maskValue).to.be.calledWith('12 / 2020');
    });

    it('updates input with month if frame is expiration month', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('expirationMonth');

      handler({
        month: '12',
        year: '2020'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.be.calledOnce;
      expect(this.fieldComponent.input.updateModel).to.be.calledWith('value', '12');
      expect(this.fieldComponent.input.element.value).to.equal('12');
    });

    it('updates input with year if frame is expiration year', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('expirationYear');

      handler({
        month: '12',
        year: '2020'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.be.calledOnce;
      expect(this.fieldComponent.input.updateModel).to.be.calledWith('value', '2020');
      expect(this.fieldComponent.input.element.value).to.equal('2020');
    });

    it('formats year as 4 digit number', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('expirationYear');

      handler({
        month: '12',
        year: '34'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.be.calledOnce;
      expect(this.fieldComponent.input.updateModel).to.be.calledWith('value', '2034');
      expect(this.fieldComponent.input.element.value).to.equal('2034');
    });

    it('sends cvv if it exists', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('cvv');

      handler({
        month: '12',
        year: '34',
        cvv: '123'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.be.calledOnce;
      expect(this.fieldComponent.input.updateModel).to.be.calledWith('value', '123');
      expect(this.fieldComponent.input.element.value).to.equal('123');
    });

    it('resets placeholder if it exists to account for bug in Safari', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      this.fieldComponent.input.element.getAttribute.returns('111');
      getFrameName.getFrameName.returns('cvv');

      handler({
        month: '12',
        year: '34',
        cvv: '123'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.element.setAttribute).to.be.calledTwice;
      expect(this.fieldComponent.input.element.setAttribute).to.be.calledWith('placeholder', '');
      expect(this.fieldComponent.input.element.setAttribute).to.be.calledWith('placeholder', '111');
    });

    it('ignores setting placeholder if no placeholder on element', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      this.fieldComponent.input.element.getAttribute.returns(null);
      getFrameName.getFrameName.returns('cvv');

      handler({
        month: '12',
        year: '34',
        cvv: '123'
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.element.setAttribute).to.not.be.called;
    });

    it('ignores cvv if it is not present', function () {
      var handler = internal.autofillHandler(this.fieldComponent);

      getFrameName.getFrameName.returns('cvv');

      handler({
        month: '12',
        year: '34',
        cvv: ''
      });

      expect(getFrameName.getFrameName).to.be.called;
      expect(this.fieldComponent.input.updateModel).to.not.be.called;
    });
  });
});
