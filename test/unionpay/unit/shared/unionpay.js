'use strict';

var Promise = require('../../../../src/lib/promise');
var analytics = require('../../../../src/lib/analytics');
var UnionPay = require('../../../../src/unionpay/shared/unionpay');
var BraintreeError = require('../../../../src/lib/braintree-error');
var events = require('../../../../src/unionpay/shared/constants').events;
var methods = require('../../../../src/lib/methods');

function noop() {}

describe('UnionPay', function () {
  beforeEach(function () {
    this.client = {
      request: this.sandbox.stub().resolves({}),
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
    it('returns a promise', function () {
      var promise = UnionPay.prototype.fetchCapabilities.call({
        _options: {client: this.client}
      }, {
        card: {number: '1234'}
      });

      expect(promise).to.respondTo('then');
      expect(promise).to.respondTo('catch');
    });

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
          request: this.sandbox.stub().returns(Promise.resolve())
        };
        var errback = noop;
        var number = '621234567890123456';
        var options = {
          card: {number: number}
        };

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: client}
        }, options, errback);

        expect(client.request).to.be.calledWith(this.sandbox.match({
          method: 'get',
          endpoint: 'payment_methods/credit_cards/capabilities',
          data: {
            creditCard: {
              number: number
            }
          }
        }));
      });

      it('calls the callback with an error when the call to the endpoint fails', function (done) {
        var clientErr = {
          type: BraintreeError.types.NETWORK,
          message: 'Your network request failed.'
        };
        var options = {
          card: {number: '12345'}
        };

        this.client.request.rejects(clientErr);

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: this.client}
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

      it('calls the callback with an error when tokenization key is used', function (done) {
        var clientErr = {
          type: BraintreeError.types.NETWORK,
          message: 'Your network request failed.',
          details: {httpStatus: 403}
        };
        var options = {
          card: {number: '12345'}
        };

        this.client.request.rejects(clientErr);

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: this.client}
        }, options, function (err, data) {
          expect(data).not.to.exist;
          expect(err).to.equal(clientErr);
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
          request: this.sandbox.stub().returns(Promise.resolve(unionPayCapabilities))
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

      it('calls analytics when unionpay capabilities succeeds', function (done) {
        var unionPayCapabilities = {
          isUnionPay: true,
          isDebit: false,
          unionPay: {
            supportsTwoStepAuthAndCapture: true,
            isSupported: false
          }
        };
        var options = {
          card: {number: '12345'}
        };

        this.client.request.resolves(unionPayCapabilities);

        UnionPay.prototype.fetchCapabilities.call({
          _options: {client: this.client}
        }, options, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.client, 'unionpay.capabilities-received');
          done();
        }.bind(this));
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

    it('calls analytics when unionpay capabilities request fails', function (done) {
      var options = {
        card: {number: '12345'}
      };

      this.client.request.rejects(new Error('error'));

      UnionPay.prototype.fetchCapabilities.call({
        _options: {client: this.client}
      }, options, function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'unionpay.capabilities-failed');
        done();
      }.bind(this));
    });

    it('sends _meta source', function (done) {
      var number = '621234567890123456';
      var options = {
        card: {number: number}
      };

      UnionPay.prototype.fetchCapabilities.call({
        _options: {client: this.client}
      }, options, function () {
        expect(this.client.request).to.be.calledWith(this.sandbox.match({
          data: {_meta: {source: 'unionpay'}}
        }));
        done();
      }.bind(this));
    });
  });

  describe('enroll', function () {
    beforeEach(function () {
      this.client.request.resolves({
        unionPayEnrollmentId: 'id',
        smsCodeRequired: true
      });
    });

    it('returns a promise', function () {
      var promise = UnionPay.prototype.enroll.call({
        _options: {client: this.client}
      }, {
        card: {
          number: '6211111111111111',
          expirationMonth: '12',
          expirationYear: '2020'
        },
        mobile: {
          countryCode: '62',
          number: '867530911'
        }
      });

      expect(promise).to.respondTo('then');
      expect(promise).to.respondTo('catch');
    });

    describe('when a card is present', function () {
      it('calls the enrollment endpoint with the card', function (done) {
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match({
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
          }));
          done();
        }.bind(this));
      });

      it('sends _meta source', function (done) {
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match({
            data: {_meta: {source: 'unionpay'}}
          }));
          done();
        }.bind(this));
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match(function (value) {
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match(function (value) {
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
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

        UnionPay.prototype.enroll.call({
          _options: {client: this.client}
        }, options, function (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('UNIONPAY_EXPIRATION_DATE_INCOMPLETE');
          expect(err.message).to.equal('You must supply expiration month and year or neither.');
        });
      });

      describe('when the enrollment fails', function () {
        it('calls analytics', function (done) {
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
          var clientErr = {
            type: BraintreeError.types.NETWORK,
            message: 'An error message'
          };

          this.client.request.rejects(clientErr);

          UnionPay.prototype.enroll.call({
            _options: {client: this.client}
          }, options, function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'unionpay.enrollment-failed');
            done();
          }.bind(this));
        });

        describe('with a 422', function () {
          it('calls the errback with a customer error', function (done) {
            var clientErr = {
              type: BraintreeError.types.CUSTOMER,
              message: 'The customer input was not valid',
              details: {httpStatus: 422}
            };

            this.client.request.rejects(clientErr);

            UnionPay.prototype.enroll.call({
              _options: {client: this.client}
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

        describe('with a 403', function () {
          it('calls the errback with a client\'s error', function (done) {
            var clientErr = {
              type: BraintreeError.types.MERCHANT,
              message: 'error',
              details: {httpStatus: 403}
            };

            this.client.request.rejects(clientErr);

            UnionPay.prototype.enroll.call({
              _options: {client: this.client}
            }, {
              card: {
                number: '5'
              },
              mobile: {
                number: '123'
              }
            }, function (err, data) {
              expect(data).not.to.exist;
              expect(err).to.equal(clientErr);
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
            var clientErr = {
              type: BraintreeError.types.NETWORK,
              message: 'Your network request failed',
              details: {httpStatus: 500}
            };

            this.client.request.rejects(clientErr);

            UnionPay.prototype.enroll.call({
              _options: {client: this.client}
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

          this.client.request.resolves({
            unionPayEnrollmentId: 'enrollment-id',
            smsCodeRequired: true
          });

          UnionPay.prototype.enroll.call({
            _options: {client: this.client}
          }, options, function (err, data) {
            expect(err).to.equal(null);
            expect(data).to.deep.equal({
              enrollmentId: 'enrollment-id',
              smsCodeRequired: true
            });

            done();
          });
        });

        it('calls analytics', function (done) {
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

          this.client.request.resolves({
            unionPayEnrollmentId: 'enrollment-id',
            smsCodeRequired: true
          });

          UnionPay.prototype.enroll.call({
            _options: {client: this.client}
          }, options, function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'unionpay.enrollment-succeeded');
            done();
          }.bind(this));
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
    beforeEach(function () {
      this.client.request.resolves({
        creditCards: [{}]
      });
    });

    describe('with raw card data', function () {
      it('returns a promise', function () {
        var promise;
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

        promise = UnionPay.prototype.tokenize.call({_options: {
          client: this.client
        }}, request);

        expect(promise).to.respondTo('then');
        expect(promise).to.respondTo('catch');
      });

      it('calls the tokenization endpoint with the card and enrollment', function () {
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
          _options: {client: this.client}
        }, request, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
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
          _options: {client: this.client}
        }, request, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match(function (value) {
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

        UnionPay.prototype.tokenize.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
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

        UnionPay.prototype.tokenize.call({
          _options: {client: this.client}
        }, options, noop);

        expect(this.client.request).to.be.calledWith(this.sandbox.match({
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

      it('does not apply expirationMonth and expirationYear to payload if empty string', function (done) {
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

        UnionPay.prototype.tokenize.call({
          _options: {client: this.client}
        }, options, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match(function (value) {
            return !value.data.creditCard.hasOwnProperty('expirationMonth') &&
              !value.data.creditCard.hasOwnProperty('expirationYear');
          }));
          done();
        }.bind(this));
      });

      it('accepts cvv if defined', function (done) {
        var request = {
          card: {
            number: '6211111111111111',
            cvv: '123'
          }
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: this.client}
        }, request, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match({
            method: 'post',
            endpoint: 'payment_methods/credit_cards',
            data: {
              creditCard: request.card
            }
          }));
          done();
        }.bind(this));
      });

      it('does not apply cvv if empty string', function (done) {
        var request = {
          card: {
            number: '6211111111111111',
            cvv: ''
          }
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: this.client}
        }, request, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match(function (value) {
            return !value.data.creditCard.hasOwnProperty('cvv');
          }));
          done();
        }.bind(this));
      });

      it('does not apply cvv if not defined', function (done) {
        var request = {
          card: {
            number: '6211111111111111'
          }
        };

        UnionPay.prototype.tokenize.call({
          _options: {client: this.client}
        }, request, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match(function (value) {
            return !value.data.creditCard.hasOwnProperty('cvv');
          }));
          done();
        }.bind(this));
      });

      it('sends _meta source', function (done) {
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
          _options: {client: this.client}
        }, request, function () {
          expect(this.client.request).to.be.calledWith(this.sandbox.match({
            data: {_meta: {source: 'unionpay'}}
          }));
          done();
        }.bind(this));
      });

      describe('when tokenization is successful', function () {
        it('calls analytics', function (done) {
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

          this.client.request.resolves({creditCards: [expectedCardNonce]});

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
          }, request, function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'unionpay.nonce-received');
            done();
          }.bind(this));
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

          this.client.request.resolves({creditCards: [expectedCardNonce]});

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
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

          this.client.request.resolves({creditCards: [expectedCardNonce]});

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
          }, request, function (err, data) {
            expect(err).to.equal(null);
            expect(data).to.not.have.property('threeDSecureInfo');
            expect(data).to.not.have.property('consumed');

            done();
          });
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
            message: 'A client error occurred',
            details: {httpStatus: 500}
          };

          this.client.request.rejects(stubError);

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
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

        it('calls the errback with an authorization error', function (done) {
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
            type: BraintreeError.types.MERCHANT,
            message: 'A client error occurred',
            details: {httpStatus: 403}
          };

          this.client.request.rejects(stubError);

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
          }, request, function (err, data) {
            expect(data).not.to.exist;
            expect(err).to.equal(stubError);

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
            message: 'A client error occurred',
            details: {httpStatus: 422}

          };

          this.client.request.rejects(stubError);

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
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

        it('calls analytics', function (done) {
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

          this.client.request.rejects(stubError);

          UnionPay.prototype.tokenize.call({
            _options: {client: this.client}
          }, request, function () {
            expect(analytics.sendEvent).to.be.calledWith(this.client, 'unionpay.nonce-failed');
            done();
          }.bind(this));
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

    it('returns a promise', function () {
      var promise = UnionPay.prototype.teardown.call({});

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('calls the callback if there is no bus', function (done) {
      UnionPay.prototype.teardown.call({}, done);
    });

    it('tears down the bus if it exists', function () {
      UnionPay.prototype.teardown.call({
        _bus: this.fakeBus,
        _hostedFieldsFrame: this.fakeHostedFieldsFrame
      });

      expect(this.fakeBus.teardown).to.be.calledOnce;
    });

    it('tears down the Hosted Fields frame if the bus exists', function () {
      UnionPay.prototype.teardown.call({
        _bus: this.fakeBus,
        _hostedFieldsFrame: this.fakeHostedFieldsFrame
      });

      expect(this.fakeHostedFieldsFrame.parentNode.removeChild).to.be.calledWith(this.fakeHostedFieldsFrame);
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
        methods(UnionPay.prototype).forEach(function (method) {
          var error;

          try {
            up[method]();
          } catch (err) {
            error = err;
          }

          expect(error).to.be.an.instanceof(BraintreeError);
          expect(error.type).to.equal('MERCHANT');
          expect(error.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
          expect(error.message).to.equal(method + ' cannot be called after teardown.');
        });

        done();
      });
    });
  });
});
