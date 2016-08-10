'use strict';

var analytics = require('../../../../src/lib/analytics');
var UnionPay = require('../../../../src/unionpay/shared/unionpay');
var BraintreeError = require('../../../../src/lib/error');
var events = require('../../../../src/unionpay/shared/constants').events;
var methods = require('../../../../src/lib/methods');

function noop() {}

describe('UnionPay', function () {
  beforeEach(function () {
    this.client = {
      getConfiguration: function () {
        return {
          gatewayConfiguration: {
            unionPay: {
              enabled: true
            }
          }
        };
      }
    };

    this.sandbox.stub(analytics, 'sendEvent');
  });

  describe('Constructor', function () {
    it('maps provided options to instance property', function () {
      var options = {
        foo: 'bar',
        client: this.client
      };
      var up = new UnionPay(options);

      expect(up._options).to.deep.equal(options);
    });
  });

  describe('fetchCapabilities', function () {
    describe('when neither card number nor Hosted Fields are present', function () {
      it('calls the errback with an err', function (done) {
        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: this.client}
        }, '', function (err, data) {
          expect(data).not.to.exist;
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED');
          expect(err.message).to.equal('A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance.');

          done();
        });
      });
    });

    describe('when card number is present', function () {
      it('calls the credit card capabilities endpoint', function () {
        var client = {
          request: this.sandbox.stub()
        };
        var errback = noop;
        var number = '621234567890123456';
        var options = {
          card: {number: number}
        };

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: client}
        }, options, errback);

        expect(client.request).to.be.calledWith(sinon.match({
          method: 'get',
          endpoint: 'payment_methods/credit_cards/capabilities',
          data: {
            creditCard: {
              number: number
            }
          }
        }));
      });

      it('calls the errback with an error when the call to the endpoint fails', function (done) {
        var clientErr = {
          type: BraintreeError.types.NETWORK,
          message: 'Your network request failed.'
        };
        var client = {
          request: function (options, errback) {
            errback(clientErr);
          }
        };
        var options = {
          card: {number: '12345'}
        };

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: client}
        }, options, function (err, data) {
          expect(data).not.to.exist;
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('NETWORK');
          expect(err.code).to.equal('UNIONPAY_FETCH_CAPABILITIES_NETWORK_ERROR');
          expect(err.message).to.equal('Could not fetch card capabilities.');
          expect(err.details.originalError).to.equal(clientErr);

          done();
        });
      });

      it('calls the errback with unionpay capabilities when the endpoint succeeds', function (done) {
        var unionPayCapabilities = {
          isUnionPay: true,
          isDebit: false,
          unionPay: {
            supportsTwoStepAuthAndCapture: true,
            isSupported: false
          }
        };
        var client = {
          request: function (options, errback) {
            errback(null, unionPayCapabilities);
          }
        };
        var options = {
          card: {number: '12345'}
        };

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: client}
        }, options, function (err, data) {
          expect(err).to.equal(null);
          expect(data).to.equal(unionPayCapabilities);

          done();
        });
      });

      it('calls analytics when unionpay capabilities succeeds', function () {
        var unionPayCapabilities = {
          isUnionPay: true,
          isDebit: false,
          unionPay: {
            supportsTwoStepAuthAndCapture: true,
            isSupported: false
          }
        };
        var client = {
          request: function (options, errback) {
            errback(null, unionPayCapabilities);
          }
        };
        var options = {
          card: {number: '12345'}
        };

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: client}
        }, options, noop);

        expect(analytics.sendEvent).to.have.been.calledWith(client, 'web.unionpay.capabilities-received');
      });
    });

    describe('when Hosted Fields instance is present', function () {
      it('emits an event to fetch capabilites', function (done) {
        var errback = noop;
        var hostedFieldsInstance = {
          _bus: {}
        };
        var options = {hostedFields: hostedFieldsInstance};

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: {}},
          _bus: {
            emit: function (eventName, emitOptions, callback) {
              expect(eventName).to.equal(events.HOSTED_FIELDS_FETCH_CAPABILITIES);
              expect(emitOptions.hostedFields).to.equal(hostedFieldsInstance);
              expect(callback).to.be.a('function');

              done();
            }
          },
          _initializeHostedFields: function (callback) {
            callback();
          }
        }, options, errback);
      });

      it('returns a BraintreeError when given invalid Hosted Fields instance', function (done) {
        var badHostedFieldsInstance = 'literal garbage';
        var options = {hostedFields: badHostedFieldsInstance};

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: {}}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID');
          expect(err.message).to.equal('Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance.');
          done();
        });
      });
    });

    it('calls analytics when unionpay capabilities request fails', function () {
      var client = {
        request: function (options, errback) {
          errback('error', null);
        }
      };
      var options = {
        card: {number: '12345'}
      };

      UnionPay.prototype.fetchCapabilities.call({
        _options: {client: client}
      }, options, noop);

      expect(analytics.sendEvent).to.have.been.calledWith(client, 'web.unionpay.capabilities-failed');
    });

    it('sends _meta source', function () {
      var client = {
        request: this.sandbox.stub()
      };
      var errback = noop;
      var number = '621234567890123456';
      var options = {
        card: {number: number}
      };

      UnionPay.prototype.fetchCapabilities.call({
        _options: {client: client}
      }, options, errback);

      expect(client.request).to.be.calledWith(sinon.match({
        data: {_meta: {source: 'unionpay'}}
      }));
    });
  });

  describe('enroll', function () {
    describe('when a card is present', function () {
      it('calls the enrollment endpoint with the card', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            expirationYear: '2020'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(this.sandbox.match({
          method: 'post',
          endpoint: 'union_pay_enrollments',
          data: {
            unionPayEnrollment: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              mobileCountryCode: '62'
            }
          }
        }), this.sandbox.match.func);
      });

      it('sends _meta source', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            expirationYear: '2020'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          data: {_meta: {source: 'unionpay'}}
        }));
      });

      it('does not pass a CVV into the request payload', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            expirationYear: '2020',
            cvv: '123'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'union_pay_enrollments',
          data: {
            unionPayEnrollment: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              mobileCountryCode: '62',
              mobileNumber: '867530911'
            }
          }
        }));
      });

      it('accepts expirationDate if defined', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationDate: '12/2020',
            cvv: '123'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'union_pay_enrollments',
          data: {
            unionPayEnrollment: {
              number: '6211111111111111',
              expirationDate: '12/2020',
              mobileCountryCode: '62',
              mobileNumber: '867530911'
            }
          }
        }));
      });

      it('accepts expirationDate over expirationMonth and expirationYear', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationDate: '12/2020',
            expirationYear: '2021',
            expirationMonth: '11',
            cvv: '123'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'union_pay_enrollments',
          data: {
            unionPayEnrollment: {
              number: '6211111111111111',
              expirationDate: '12/2020',
              mobileCountryCode: '62',
              mobileNumber: '867530911'
            }
          }
        }));
      });

      it('does not apply expirationMonth and expirationYear to payload if undefined', function () {
        var options = {
          card: {
            number: '6211111111111111'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match(function (value) {
          return !value.data.unionPayEnrollment.hasOwnProperty('expirationMonth') &&
            !value.data.unionPayEnrollment.hasOwnProperty('expirationYear');
        }));
      });

      it('does not apply expirationMonth and expirationYear to payload if empty string', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '',
            expirationYear: ''
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match(function (value) {
          return !value.data.unionPayEnrollment.hasOwnProperty('expirationMonth') &&
            !value.data.unionPayEnrollment.hasOwnProperty('expirationYear');
        }));
      });

      it('returns a BraintreeError if expirationMonth undefined but expirationYear is defined', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationYear: '2019'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_EXPIRATION_DATE_INCOMPLETE');
          expect(err.message).to.equal('You must supply expiration month and year or neither.');
        });
      });

      it('returns a BraintreeError if expirationYear undefined but expirationMonth is defined', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12'
          },
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.enroll.call({
          _options: {client: mockClient}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_EXPIRATION_DATE_INCOMPLETE');
          expect(err.message).to.equal('You must supply expiration month and year or neither.');
        });
      });

      describe('when the enrollment fails', function () {
        var clientErr, stubClient, clientStatus;

        beforeEach(function () {
          clientStatus = 500;
          stubClient = {
            request: function (options, clientErrback) {
              clientErrback(clientErr, null, clientStatus);
            }
          };
        });

        it('calls analytics', function () {
          var options = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020'
            },
            mobile: {
              countryCode: '62',
              number: '867530911'
            }
          };

          clientErr = {
            type: BraintreeError.types.NETWORK,
            message: 'An error message'
          };
          UnionPay.prototype.enroll.call({
            _options: {client: stubClient}
          }, options, noop);

          expect(analytics.sendEvent).to.be.calledWith(stubClient, 'web.unionpay.enrollment-failed');
        });

        describe('with a 422', function () {
          it('calls the errback with a customer error', function (done) {
            clientErr = {
              type: BraintreeError.types.CUSTOMER,
              message: 'The customer input was not valid'
            };
            clientStatus = 422;

            UnionPay.prototype.enroll.call({
              _options: {client: stubClient}
            }, {
              card: {
                number: '5'
              },
              mobile: {
                number: '123'
              }
            }, function (err, data) {
              expect(data).not.to.exist;
              expect(err).to.be.an.instanceof(BraintreeError);
              expect(err.type).to.equal('CUSTOMER');
              expect(err.code).to.equal('UNIONPAY_ENROLLMENT_CUSTOMER_INPUT_INVALID');
              expect(err.message).to.equal('Enrollment failed due to user input error.');
              expect(err.details.originalError).to.eql(clientErr);

              done();
            });
          });
        });

        describe('with a network error', function () {
          var options = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020'
            },
            mobile: {
              countryCode: '62',
              number: '867530911'
            }
          };

          it('calls the errback with a network error', function (done) {
            clientErr = {
              type: BraintreeError.types.NETWORK,
              message: 'Your network request failed'
            };
            clientStatus = 500;

            UnionPay.prototype.enroll.call({
              _options: {client: stubClient}
            }, options, function (err, data) {
              expect(data).not.to.exist;
              expect(err).to.be.an.instanceof(BraintreeError);
              expect(err.type).to.equal('NETWORK');
              expect(err.code).to.equal('UNIONPAY_ENROLLMENT_NETWORK_ERROR');
              expect(err.message).to.equal('Could not enroll UnionPay card.');
              expect(err.details.originalError).to.equal(clientErr);

              done();
            });
          });
        });
      });

      describe('when the enrollment succeeds', function () {
        it('calls the errback with the enrollment ID', function (done) {
          var options = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020'
            },
            mobile: {
              countryCode: '62',
              number: '867530911'
            }
          };

          var stubClient = {
            request: function (requestOptions, errback) {
              errback(null, {
                unionPayEnrollmentId: 'enrollment-id',
                smsCodeRequired: true
              });
            }
          };

          UnionPay.prototype.enroll.call({
            _options: {client: stubClient}
          }, options, function (err, data) {
            expect(err).to.equal(null);
            expect(data).to.deep.equal({
              enrollmentId: 'enrollment-id',
              smsCodeRequired: true
            });

            done();
          });
        });

        it('calls analytics', function () {
          var options = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020'
            },
            mobile: {
              countryCode: '62',
              number: '867530911'
            }
          };

          var stubClient = {
            request: function (requestOptions, errback) {
              errback(null, {
                unionPayEnrollmentId: 'enrollment-id',
                smsCodeRequired: true
              });
            }
          };

          UnionPay.prototype.enroll.call({
            _options: {client: stubClient}
          }, options, noop);

          expect(analytics.sendEvent).to.be.calledWith(stubClient, 'web.unionpay.enrollment-succeeded');
        });
      });
    });

    describe('when a Hosted Fields instance is present', function () {
      it('emits an event to enroll', function (done) {
        var errback = noop;
        var hostedFieldsInstance = {
          _bus: {}
        };
        var options = {
          hostedFields: hostedFieldsInstance,
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        UnionPay.prototype.enroll.call({
          _options: {client: {}},
          _bus: {
            emit: function (eventName, emitOptions, callback) {
              expect(eventName).to.equal(events.HOSTED_FIELDS_ENROLL);
              expect(emitOptions.hostedFields).to.equal(hostedFieldsInstance);
              expect(callback).to.be.a('function');

              done();
            }
          },
          _initializeHostedFields: function (callback) {
            callback();
          }
        }, options, errback);
      });

      it('returns a BraintreeError when given invalid Hosted Fields instance', function (done) {
        var badHostedFieldsInstance = 'literal garbage';
        var options = {
          hostedFields: badHostedFieldsInstance,
          mobile: {
            countryCode: '62',
            number: '867530911'
          }
        };

        UnionPay.prototype.enroll.call({
          _options: {client: {}}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID');
          expect(err.message).to.equal('Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance.');
          done();
        });
      });

      it('returns a BraintreeError when given a Hosted Fields instance without mobile data', function (done) {
        var hostedFieldsInstance = {
          _bus: {}
        };
        var options = {hostedFields: hostedFieldsInstance};

        UnionPay.prototype.enroll.call({
          _options: {client: {}}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_MISSING_MOBILE_PHONE_DATA');
          expect(err.message).to.equal('A `mobile` with `countryCode` and `number` is required.');
          done();
        });
      });

      it('returns a BraintreeError when given a Hosted Fields instance with a card property', function (done) {
        var hostedFieldsInstance = {
          _bus: {}
        };
        var options = {
          hostedFields: hostedFieldsInstance,
          card: {},
          mobile: {}
        };

        UnionPay.prototype.enroll.call({
          _options: {client: {}}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_CARD_AND_HOSTED_FIELDS_INSTANCES');
          expect(err.message).to.equal('Please supply either a card or a Hosted Fields instance, not both.');
          done();
        });
      });
    });

    it('returns a BraintreeError if given neither a card nor a Hosted Fields instance', function (done) {
      UnionPay.prototype.enroll.call({
        _options: {client: {}}
      }, {mobile: {}}, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED');
        expect(err.message).to.equal('A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance.');
        done();
      });
    });
  });

  describe('tokenize', function () {
    describe('with raw card data', function () {
      it('calls the tokenization endpoint with the card and enrollment', function () {
        var mockClient = {request: this.sandbox.stub()};
        var request = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            expirationYear: '2020',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '123456'
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, request, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'payment_methods/credit_cards',
          data: {
            creditCard: {
              number: request.card.number,
              expirationMonth: request.card.expirationMonth,
              expirationYear: request.card.expirationYear,
              cvv: request.card.cvv,
              options: {
                unionPayEnrollment: {
                  id: 'enrollment-id',
                  smsCode: '123456'
                }
              }
            }
          }
        }));
      });

      it('does not pass smsCode if !smsCodeRequired', function () {
        var mockClient = {request: this.sandbox.stub()};
        var request = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            expirationYear: '2020',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id'
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, request, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match(function (value) {
          return !value.data.creditCard.options.unionPayEnrollment.hasOwnProperty('smsCode');
        }));
      });

      it('accepts expirationDate if defined', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationDate: '12/2020',
            expirationYear: '2021',
            expirationMonth: '11',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '12345'
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'payment_methods/credit_cards',
          data: {
            creditCard: {
              number: '6211111111111111',
              expirationDate: '12/2020',
              cvv: '123',
              options: {
                unionPayEnrollment: {
                  id: 'enrollment-id',
                  smsCode: '12345'
                }
              }
            }
          }
        }));
      });

      it('accepts expirationDate over expirationMonth and expirationYear', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationDate: '12/2020',
            expirationYear: '2021',
            expirationMonth: '11',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '12345'
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'payment_methods/credit_cards',
          data: {
            creditCard: {
              number: '6211111111111111',
              expirationDate: '12/2020',
              cvv: '123',
              options: {
                unionPayEnrollment: {
                  id: 'enrollment-id',
                  smsCode: '12345'
                }
              }
            }
          }
        }));
      });

      it('does not apply expirationMonth and expirationYear to payload if empty string', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '',
            expirationYear: '',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '123456'
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, options, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match(function (value) {
          return !value.data.creditCard.hasOwnProperty('expirationMonth') &&
            !value.data.creditCard.hasOwnProperty('expirationYear');
        }));
      });

      it('returns a BraintreeError if expirationMonth undefined but expirationYear is defined', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationYear: '2019',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '123456'
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_EXPIRATION_DATE_INCOMPLETE');
          expect(err.message).to.equal('You must supply expiration month and year or neither.');
        });
      });

      it('returns a BraintreeError if expirationYear undefined but expirationMonth is defined', function () {
        var options = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '123456'
        };

        var mockClient = {
          request: this.sandbox.stub()
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_EXPIRATION_DATE_INCOMPLETE');
          expect(err.message).to.equal('You must supply expiration month and year or neither.');
        });
      });

      it('accepts cvv if defined', function () {
        var mockClient = {request: this.sandbox.stub()};
        var request = {
          card: {
            number: '6211111111111111',
            cvv: '123'
          }
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, request, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          method: 'post',
          endpoint: 'payment_methods/credit_cards',
          data: {
            creditCard: request.card
          }
        }));
      });

      it('does not apply cvv if empty string', function () {
        var mockClient = {request: this.sandbox.stub()};
        var request = {
          card: {
            number: '6211111111111111',
            cvv: ''
          }
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, request, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match(function (value) {
          return !value.data.creditCard.hasOwnProperty('cvv');
        }));
      });

      it('does not apply cvv if not defined', function () {
        var mockClient = {request: this.sandbox.stub()};
        var request = {
          card: {
            number: '6211111111111111'
          }
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, request, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match(function (value) {
          return !value.data.creditCard.hasOwnProperty('cvv');
        }));
      });

      it('sends _meta source', function () {
        var mockClient = {request: this.sandbox.stub()};
        var request = {
          card: {
            number: '6211111111111111',
            expirationMonth: '12',
            expirationYear: '2020',
            cvv: '123'
          },
          enrollmentId: 'enrollment-id',
          smsCode: '123456'
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: mockClient}
        }, request, noop);

        expect(mockClient.request).to.be.calledWith(sinon.match({
          data: {_meta: {source: 'unionpay'}}
        }));
      });

      describe('when tokenization is successful', function () {
        it('calls analytics', function () {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456'
          };
          var expectedCardNonce = {
            consumed: false,
            description: 'ending in 11',
            details: {
              cardType: 'unionpay',
              lastTwo: '11'
            },
            nonce: 'a-nonce',
            type: 'CreditCard'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              clientErrback(null, {creditCards: [expectedCardNonce]});
            }
          };
          var errback = this.sandbox.stub();

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, errback);

          expect(analytics.sendEvent).to.be.calledWith(stubClient, 'web.unionpay.nonce-received');
        });

        it('calls the errback with a nonce', function (done) {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456'
          };
          var expectedCardNonce = {
            consumed: false,
            description: 'ending in 11',
            details: {
              cardType: 'unionpay',
              lastTwo: '11'
            },
            nonce: 'a-nonce',
            type: 'CreditCard'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              var data = options.data;

              expect(data.creditCard.number).to.exist;
              expect(data.creditCard.expirationMonth).to.exist;
              expect(data.creditCard.expirationYear).to.exist;
              expect(data.creditCard.cvv).to.exist;
              expect(data.creditCard.options.unionPayEnrollment.id).to.exist;
              expect(data.creditCard.options.unionPayEnrollment.smsCode).to.exist;
              clientErrback(null, {creditCards: [expectedCardNonce]});
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, function (err, data) {
            expect(err).to.equal(null);
            expect(data).to.equal(expectedCardNonce);
            expect(data).to.have.property('description');
            expect(data).to.have.property('details');
            expect(data).to.have.property('nonce');
            expect(data).to.have.property('type');

            done();
          });
        });

        it('removes some card properties before returning', function (done) {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            }
          };
          var expectedCardNonce = {
            consumed: false,
            description: 'ending in 11',
            details: {
              cardType: 'unionpay',
              lastTwo: '11'
            },
            nonce: 'a-nonce',
            type: 'CreditCard',
            threeDSecureInfo: {
              some: 'info'
            }
          };
          var stubClient = {
            request: function (options, clientErrback) {
              clientErrback(null, {creditCards: [expectedCardNonce]});
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, function (err, data) {
            expect(err).to.equal(null);
            expect(data).to.not.have.property('threeDSecureInfo');
            expect(data).to.not.have.property('consumed');

            done();
          });
        });

        it('defaults vault option to false', function (done) {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456'
          };
          var expectedCardNonce = {
            consumed: false,
            description: 'ending in 11',
            details: {
              cardType: 'unionpay',
              lastTwo: '11'
            },
            nonce: 'a-nonce',
            type: 'CreditCard'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              var data = options.data;

              expect(data.creditCard.options.validate).to.be.false;
              clientErrback(null, {creditCards: [expectedCardNonce]});
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, done);
        });

        it('can set vault to true', function (done) {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456',
            vault: true
          };
          var expectedCardNonce = {
            consumed: false,
            description: 'ending in 11',
            details: {
              cardType: 'unionpay',
              lastTwo: '11'
            },
            nonce: 'a-nonce',
            type: 'CreditCard'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              var data = options.data;

              expect(data.creditCard.options.validate).to.be.true;
              clientErrback(null, {creditCards: [expectedCardNonce]});
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, done);
        });
      });

      describe('when tokenization fails', function () {
        it('calls the errback with an error', function (done) {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456'
          };
          var stubError = {
            type: BraintreeError.types.NETWORK,
            message: 'A client error occurred'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              clientErrback(stubError, null, 500);
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, function (err, data) {
            expect(data).not.to.exist;
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('NETWORK');
            expect(err.code).to.equal('UNIONPAY_TOKENIZATION_NETWORK_ERROR');
            expect(err.message).to.equal('A tokenization network error occurred.');
            expect(err.details.originalError).to.equal(stubError);

            done();
          });
        });

        it('calls the errback with a CUSTOMER error', function (done) {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456'
          };
          var stubError = {
            type: BraintreeError.types.NETWORK,
            message: 'A client error occurred'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              clientErrback(stubError, null, 422);
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, function (err, data) {
            expect(data).not.to.exist;
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('CUSTOMER');
            expect(err.code).to.equal('UNIONPAY_FAILED_TOKENIZATION');
            expect(err.message).to.equal('The supplied card data failed tokenization.');
            expect(err.details.originalError).to.equal(stubError);

            done();
          });
        });

        it('calls analytics', function () {
          var request = {
            card: {
              number: '6211111111111111',
              expirationMonth: '12',
              expirationYear: '2020',
              cvv: '123'
            },
            enrollmentId: 'enrollment-id',
            smsCode: '123456'
          };
          var stubError = {
            type: BraintreeError.types.NETWORK,
            message: 'A client error occurred'
          };
          var stubClient = {
            request: function (options, clientErrback) {
              clientErrback(stubError, null);
            }
          };

          UnionPay.prototype.tokenize.call({
            _options: {client: stubClient}
          }, request, noop);

          expect(analytics.sendEvent).to.be.calledWith(stubClient, 'web.unionpay.nonce-failed');
        });
      });
    });

    describe('with a Hosted Fields instance', function () {
      it('emits an event to tokenize', function (done) {
        var hostedFieldsInstance = {
          _bus: {}
        };
        var options = {
          hostedFields: hostedFieldsInstance,
          enrollmentId: 'abc123',
          smsCode: 'ayy'
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: {}},
          _bus: {
            emit: function (eventName, emitOptions, callback) {
              expect(eventName).to.equal(events.HOSTED_FIELDS_TOKENIZE);
              expect(emitOptions.hostedFields).to.equal(hostedFieldsInstance);
              expect(callback).to.be.a('function');

              done();
            }
          },
          _initializeHostedFields: function (callback) {
            callback();
          }
        }, options, noop);
      });

      it('returns a BraintreeError when given invalid Hosted Fields instance', function (done) {
        var badHostedFieldsInstance = 'literal garbage';
        var options = {
          hostedFields: badHostedFieldsInstance,
          enrollmentId: 'abc123',
          smsCode: 'ayy'
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: {}}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_HOSTED_FIELDS_INSTANCE_INVALID');
          expect(err.message).to.equal('Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance.');
          done();
        });
      });
    });

    it('returns a BraintreeError if given neither a card nor a Hosted Fields instance', function (done) {
      UnionPay.prototype.tokenize.call({
        _options: {client: {}}
      }, {}, function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('UNIONPAY_CARD_OR_HOSTED_FIELDS_INSTANCE_REQUIRED');
        expect(err.message).to.equal('A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance.');
        done();
      });
    });
  });

  describe('teardown', function () {
    beforeEach(function () {
      this.fakeBus = {teardown: this.sandbox.stub()};
      this.fakeHostedFieldsFrame = {
        parentNode: {
          removeChild: this.sandbox.stub()
        }
      };
    });

    it("doesn't throw if there is no bus and no callback", function () {
      expect(function () {
        UnionPay.prototype.teardown.call({});
      }).not.to.throw;
    });

    it('calls the callback if there is no bus', function (done) {
      UnionPay.prototype.teardown.call({}, done);
    });

    it('tears down the bus if it exists', function () {
      UnionPay.prototype.teardown.call({
        _bus: this.fakeBus,
        _hostedFieldsFrame: this.fakeHostedFieldsFrame
      });

      expect(this.fakeBus.teardown).to.have.been.calledOnce;
    });

    it('tears down the Hosted Fields frame if the bus exists', function () {
      UnionPay.prototype.teardown.call({
        _bus: this.fakeBus,
        _hostedFieldsFrame: this.fakeHostedFieldsFrame
      });

      expect(this.fakeHostedFieldsFrame.parentNode.removeChild).to.have.been.calledWith(this.fakeHostedFieldsFrame);
    });

    it('calls the callback if there is a bus', function (done) {
      UnionPay.prototype.teardown.call({
        _bus: this.fakeBus,
        _hostedFieldsFrame: this.fakeHostedFieldsFrame
      }, done);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var up = new UnionPay({client: this.client});

      up.teardown(function () {
        methods(up).forEach(function (method) {
          try {
            up[method]();
          } catch (err) {
            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
            expect(err.message).to.equal(method + ' cannot be called after teardown.');
          }
        });

        done();
      });
    });
  });
});
