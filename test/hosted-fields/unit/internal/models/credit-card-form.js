'use strict';

var CreditCardForm = require('../../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var getCardTypes = require('credit-card-type');
var nextYear = (new Date().getFullYear() + 1).toString();
var events = require('../../../../../src/hosted-fields/shared/constants').events;
var externalEvents = require('../../../../../src/hosted-fields/shared/constants').externalEvents;

describe('credit card model', function () {
  beforeEach(function () {
    this.card = new CreditCardForm(helpers.getModelConfig([
      'number',
      'cvv',
      'expirationDate',
      'postalCode'
    ]));
  });

  it('starts with empty values', function () {
    expect(this.card.get('number').value).to.equal('');
    expect(this.card.get('cvv').value).to.equal('');
    expect(this.card.get('expirationDate').value).to.equal('');
    expect(this.card.get('postalCode').value).to.equal('');
  });

  describe('constructor()', function () {
    beforeEach(function () {
      this.sandbox.stub(CreditCardForm.prototype, 'on');
    });

    describe('_fieldKeys', function () {
      it('sets a _fieldKeys property', function () {
        var cardForm = new CreditCardForm(helpers.getModelConfig());

        expect(cardForm._fieldKeys).to.exist;
      });

      it('assigns only whitelisted fields', function () {
        var cardForm = new CreditCardForm(helpers.getModelConfig([
          'number',
          'foo'
        ]));

        expect(cardForm._fieldKeys).to.deep.equal(['number']);
      });
    });

    it('sets a configuration property', function () {
      var configuration = helpers.getModelConfig();
      var cardForm = new CreditCardForm(configuration);

      expect(cardForm.configuration).to.equal(configuration);
    });

    it('attaches change events for each field (cvv only)', function () {
      var configuration = helpers.getModelConfig();
      var cardForm = new CreditCardForm(configuration);

      expect(cardForm.on.callCount).to.equal(8);

      // CVV is the only field by default
      expect(cardForm.on.getCall(0).args[0]).to.equal('change:cvv.value');
      expect(cardForm.on.getCall(0).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(1).args[0]).to.equal('change:cvv.isFocused');
      expect(cardForm.on.getCall(1).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(2).args[0]).to.equal('change:cvv.isEmpty');
      expect(cardForm.on.getCall(2).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(3).args[0]).to.equal('change:cvv.isValid');
      expect(cardForm.on.getCall(3).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(4).args[0]).to.equal('change:cvv.isPotentiallyValid');
      expect(cardForm.on.getCall(4).args[1]).to.be.an.instanceof(Function);

      expect(cardForm.on.getCall(5).args[0]).to.equal('change:number.value');
      expect(cardForm.on.getCall(5).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(6).args[0]).to.equal('change:possibleCardTypes');
      expect(cardForm.on.getCall(6).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(7).args[0]).to.equal('change:possibleCardTypes');
      expect(cardForm.on.getCall(7).args[1]).to.be.an.instanceof(Function);
    });

    it('attaches change events for each field', function () {
      var configuration = helpers.getModelConfig([
        'number',
        'cvv',
        'expirationDate'
      ]);
      var cardForm = new CreditCardForm(configuration);

      expect(cardForm.on.callCount).to.equal(18);

      expect(cardForm.on.getCall(0).args[0]).to.equal('change:number.value');
      expect(cardForm.on.getCall(0).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(1).args[0]).to.equal('change:number.isFocused');
      expect(cardForm.on.getCall(1).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(2).args[0]).to.equal('change:number.isEmpty');
      expect(cardForm.on.getCall(2).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(3).args[0]).to.equal('change:number.isValid');
      expect(cardForm.on.getCall(3).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(4).args[0]).to.equal('change:number.isPotentiallyValid');
      expect(cardForm.on.getCall(4).args[1]).to.be.an.instanceof(Function);

      expect(cardForm.on.getCall(5).args[0]).to.equal('change:cvv.value');
      expect(cardForm.on.getCall(5).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(6).args[0]).to.equal('change:cvv.isFocused');
      expect(cardForm.on.getCall(6).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(7).args[0]).to.equal('change:cvv.isEmpty');
      expect(cardForm.on.getCall(7).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(8).args[0]).to.equal('change:cvv.isValid');
      expect(cardForm.on.getCall(8).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(9).args[0]).to.equal('change:cvv.isPotentiallyValid');
      expect(cardForm.on.getCall(9).args[1]).to.be.an.instanceof(Function);

      expect(cardForm.on.getCall(10).args[0]).to.equal('change:expirationDate.value');
      expect(cardForm.on.getCall(10).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(11).args[0]).to.equal('change:expirationDate.isFocused');
      expect(cardForm.on.getCall(11).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(12).args[0]).to.equal('change:expirationDate.isEmpty');
      expect(cardForm.on.getCall(12).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(13).args[0]).to.equal('change:expirationDate.isValid');
      expect(cardForm.on.getCall(13).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(14).args[0]).to.equal('change:expirationDate.isPotentiallyValid');
      expect(cardForm.on.getCall(14).args[1]).to.be.an.instanceof(Function);

      expect(cardForm.on.getCall(15).args[0]).to.equal('change:number.value');
      expect(cardForm.on.getCall(15).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(16).args[0]).to.equal('change:possibleCardTypes');
      expect(cardForm.on.getCall(16).args[1]).to.be.an.instanceof(Function);
      expect(cardForm.on.getCall(17).args[0]).to.equal('change:possibleCardTypes');
      expect(cardForm.on.getCall(17).args[1]).to.be.an.instanceof(Function);
    });
  });

  describe('resetAttributes', function () {
    it('returns the right object for each field', function () {
      var emptyProperty = {
        value: '',
        isFocused: false,
        isValid: false,
        isPotentiallyValid: true,
        isEmpty: true
      };

      expect(this.card.resetAttributes()).to.deep.equal({
        number: emptyProperty,
        cvv: emptyProperty,
        expirationDate: emptyProperty,
        postalCode: emptyProperty,
        possibleCardTypes: getCardTypes('')
      });
    });
  });

  describe('emitEvent', function () {
    it('sends the proper form data', function () {
      var fakeData = {
        possibleCardTypes: [],
        number: {
          value: '',
          isEmpty: true,
          isValid: false,
          isPotentiallyValid: true,
          isFocused: false
        },
        cvv: {
          value: '123',
          isEmpty: false,
          isValid: true,
          isPotentiallyValid: true,
          isFocused: false
        },
        expirationDate: {
          value: 'bad',
          isEmpty: false,
          isValid: false,
          isPotentiallyValid: false,
          isFocused: true
        }
      };

      CreditCardForm.prototype.emitEvent.call({
        get: function (property) { return fakeData[property]; },
        _fieldKeys: [
          'number',
          'cvv',
          'expirationDate'
        ]
      }, 'number', 'foo');

      expect(global.bus.emit).to.have.been.calledWith(events.INPUT_EVENT, this.sandbox.match({
        merchantPayload: {
          cards: [],
          emittedBy: 'number',
          fields: {
            number: {
              isEmpty: true,
              isValid: false,
              isPotentiallyValid: true,
              isFocused: false
            },
            cvv: {
              isEmpty: false,
              isValid: true,
              isPotentiallyValid: true,
              isFocused: false
            },
            expirationDate: {
              isEmpty: false,
              isValid: false,
              isPotentiallyValid: false,
              isFocused: true
            }
          }
        },
        type: 'foo'
      }));
    });

    it('sends an empty array if there are 0 possible card types', function () {
      CreditCardForm.prototype.emitEvent.call({
        get: function (property) {
          if (property === 'possibleCardTypes') { return []; }
          return {};
        },
        _fieldKeys: []
      }, 'number', 'foo');

      expect(global.bus.emit).to.have.been.calledWith(events.INPUT_EVENT, this.sandbox.match({
        merchantPayload: {
          cards: [],
          emittedBy: 'number',
          fields: {}
        },
        type: 'foo'
      }));
    });

    it('sends an array of possible cards if there are more than 1 possible card types', function () {
      var cards = [
        {
          niceType: 'Visa',
          type: 'visa',
          code: {
            size: 3,
            name: 'CVV'
          },
          gaps: [3, 7, 11]
        },
        {
          niceType: 'Discover',
          type: 'discover',
          code: {
            size: 3,
            name: 'CID'
          },
          gaps: [3, 7, 11]
        }
      ];

      CreditCardForm.prototype.emitEvent.call({
        get: function (property) {
          if (property === 'possibleCardTypes') { return cards; }
          return {};
        },
        _fieldKeys: []
      }, 'number', 'foo');

      expect(global.bus.emit).to.have.been.calledWith(events.INPUT_EVENT, this.sandbox.match({
        merchantPayload: {
          cards: cards.map(function (card) {
            return {
              niceType: card.niceType,
              type: card.type,
              code: card.code
            };
          }),
          emittedBy: 'number',
          fields: {}
        },
        type: 'foo'
      }));
    });

    it('sends a card if there is 1 possible card type', function () {
      CreditCardForm.prototype.emitEvent.call({
        get: function (property) {
          if (property === 'possibleCardTypes') {
            return [{
              niceType: 'Visa',
              type: 'visa',
              code: {
                size: 3,
                name: 'CVV'
              },
              gaps: [3, 7, 11]
            }];
          }
          return {};
        },
        _fieldKeys: []
      }, 'number', 'foo');

      expect(global.bus.emit).to.have.been.calledWith(events.INPUT_EVENT, this.sandbox.match({
        merchantPayload: {
          cards: [{
            niceType: 'Visa',
            type: 'visa',
            code: {
              size: 3,
              name: 'CVV'
            }
          }],
          emittedBy: 'number',
          fields: {}
        },
        type: 'foo'
      }));
    });
  });

  describe('getCardData', function () {
    it('gets credit card number', function () {
      this.card.set('number.value', '4111111111111111');
      expect(this.card.getCardData().number).to.equal('4111111111111111');

      this.card.set('number.value', '');
      expect(this.card.getCardData().number).to.equal('');
    });

    it('skips credit card number if not in the config', function () {
      var card = new CreditCardForm(helpers.getModelConfig([
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      expect(card.getCardData().number).to.be.undefined;
      card.set('number.value', '4111111111111111');
      expect(card.getCardData().number).to.be.undefined;
      card.set('number.value', '');
      expect(card.getCardData().number).to.be.undefined;
    });

    it('skips CVV if not in the config', function () {
      var card = new CreditCardForm(helpers.getModelConfig([
        'number',
        'expirationMonth',
        'expirationYear'
      ]));

      expect(card.getCardData().cvv).to.be.undefined;
      card.set('cvv.value', '123');
      expect(card.getCardData().cvv).to.be.undefined;
      card.set('cvv.value', '');
      expect(card.getCardData().cvv).to.be.undefined;
    });

    it('gets CVV if specified in the config', function () {
      this.card.set('cvv.value', '123');
      expect(this.card.getCardData().cvv).to.equal('123');

      this.card.set('cvv.value', '');
      expect(this.card.getCardData().cvv).to.equal('');
    });

    it('can get expiration month and year from the expirationDate', function () {
      var cardData;

      this.card.set('expirationDate.value', '10' + nextYear);
      cardData = this.card.getCardData();
      expect(cardData.expirationMonth).to.equal('10');
      expect(cardData.expirationYear).to.equal(nextYear);

      this.card.set('expirationDate.value', '01' + nextYear);
      cardData = this.card.getCardData();
      expect(cardData.expirationMonth).to.equal('01');
      expect(cardData.expirationYear).to.equal(nextYear);

      this.card.set('expirationDate.value', '');
      cardData = this.card.getCardData();
      expect(cardData.expirationMonth).to.equal('');
      expect(cardData.expirationYear).to.equal('');
    });

    it('skips expiration if neither are in the config', function () {
      var card = new CreditCardForm(helpers.getModelConfig([
        'number'
      ]));

      expect(card.getCardData().expirationYear).to.be.undefined;
      card.set('expirationYear.value', '2020');
      expect(card.getCardData().expirationYear).to.be.undefined;
      card.set('expirationYear.value', '');
      expect(card.getCardData().expirationYear).to.be.undefined;

      expect(card.getCardData().expirationMonth).to.be.undefined;
      card.set('expirationMonth.value', '2020');
      expect(card.getCardData().expirationMonth).to.be.undefined;
      card.set('expirationMonth.value', '');
      expect(card.getCardData().expirationMonth).to.be.undefined;

      expect(card.getCardData().expirationDate).to.be.undefined;
      card.set('expirationDate.value', '2020');
      expect(card.getCardData().expirationDate).to.be.undefined;
      card.set('expirationDate.value', '');
      expect(card.getCardData().expirationDate).to.be.undefined;
    });

    it('can get expiration month and year if expirationDate is not specified', function () {
      var cardData;
      var card = new CreditCardForm(helpers.getModelConfig([
        'number',
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      card.set('expirationMonth.value', '10');
      card.set('expirationYear.value', nextYear);
      cardData = card.getCardData();
      expect(cardData.expirationMonth).to.equal('10');
      expect(cardData.expirationYear).to.equal(nextYear);

      card.set('expirationMonth.value', '');
      card.set('expirationYear.value', nextYear);
      cardData = card.getCardData();
      expect(cardData.expirationMonth).to.equal('');
      expect(cardData.expirationYear).to.equal(nextYear);

      card.set('expirationMonth.value', '02');
      card.set('expirationYear.value', '');
      cardData = card.getCardData();
      expect(cardData.expirationMonth).to.equal('02');
      expect(cardData.expirationYear).to.equal('');

      card.set('expirationMonth.value', '');
      card.set('expirationYear.value', '');
      cardData = card.getCardData();
      expect(cardData.expirationMonth).to.equal('');
      expect(cardData.expirationYear).to.equal('');

      card.set('expirationMonth.value', '13');
      card.set('expirationYear.value', '1920');
      cardData = card.getCardData();
      expect(cardData.expirationMonth).to.equal('13');
      expect(cardData.expirationYear).to.equal('1920');
    });

    it('gets postal code if present', function () {
      this.card.set('postalCode.value', '6061b');
      expect(this.card.getCardData().postalCode).to.equal('6061b');

      this.card.set('postalCode.value', '');
      expect(this.card.getCardData().postalCode).to.equal('');
    });

    it('skips postal code if not present in the configuration', function () {
      var card = new CreditCardForm(helpers.getModelConfig([
        'number',
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      expect(card.getCardData().postalCode).to.be.undefined;

      card.set('postalCode.value', '6061b');
      expect(card.getCardData().postalCode).to.be.undefined;

      card.set('postalCode.value', '');
      expect(card.getCardData().postalCode).to.be.undefined;
    });
  });

  describe('isEmpty', function () {
    it('returns true when fields are empty', function () {
      expect(this.card.isEmpty()).to.equal(true);
    });

    it('returns true when fields are set to empty', function () {
      this.card.set('number.value', '');
      this.card.set('cvv.value', '');
      this.card.set('expirationDate.value', '');
      this.card.set('postalCode.value', '');

      expect(this.card.isEmpty()).to.equal(true);
    });

    it('returns false when fields are filled', function () {
      this.card.set('number.value', '4111111111111111');
      this.card.set('cvv.value', '123');
      this.card.set('expirationDate.value', '07' + nextYear);
      this.card.set('postalCode.value', '30303');

      expect(this.card.isEmpty()).to.equal(false);
    });

    it('returns false when some fields are empty', function () {
      this.card.set('number.value', '');
      this.card.set('cvv.value', '');
      this.card.set('expirationDate.value', '07' + nextYear);
      this.card.set('postalCode.value', '30303');

      expect(this.card.isEmpty()).to.equal(false);
    });
  });

  describe('invalidFieldKeys', function () {
    it('returns invalid keys when all fields are invalid', function () {
      this.card.set('number.value', 'not-a-card-number');
      this.card.set('cvv.value', 'not-a-cvv');
      this.card.set('expirationDate.value', '041789');
      this.card.set('postalCode.value', '');

      expect(this.card.invalidFieldKeys()).to.contain('number');
      expect(this.card.invalidFieldKeys()).to.contain('cvv');
      expect(this.card.invalidFieldKeys()).to.contain('expirationDate');
      expect(this.card.invalidFieldKeys()).to.contain('postalCode');
    });

    it('returns only invalid keys when some keys are invalid', function () {
      this.card.set('number.value', '4111111111111111');
      this.card.set('cvv.value', '123');
      this.card.set('expirationDate.value', '041789');
      this.card.set('postalCode.value', '');

      expect(this.card.invalidFieldKeys()).to.not.contain('number');
      expect(this.card.invalidFieldKeys()).to.not.contain('cvv');
      expect(this.card.invalidFieldKeys()).to.contain('expirationDate');
      expect(this.card.invalidFieldKeys()).to.contain('postalCode');
    });

    it('returns an empty array when all keys are valid', function () {
      this.card.set('number.value', '4111111111111111');
      this.card.set('cvv.value', '123');
      this.card.set('expirationDate.value', '07' + nextYear);
      this.card.set('postalCode.value', '30305');

      expect(this.card.invalidFieldKeys()).to.be.empty;
      expect(this.card.invalidFieldKeys()).to.be.instanceOf(Array);
    });
  });

  describe('possibleCardTypes', function () {
    it('changes credit card type when the number changes', function () {
      var assert = function () {
        var types = this.card.get('possibleCardTypes');
        var number = this.card.get('number').value;

        expect(types).to.deep.equal(getCardTypes(number));
      }.bind(this);

      assert();

      this.card.set('number.value', '4');
      assert();

      this.card.set('number.value', '411');
      assert();

      this.card.set('number.value', '4111111111111111');
      assert();

      this.card.set('number.value', '5555');
      assert();

      this.card.set('number.value', '5555555555554444');
      assert();

      this.card.set('number.value', '378');
      assert();

      this.card.set('number.value', '378282246310005');
      assert();

      this.card.set('number.value', '');
      assert();
    });

    it('revalidates CVV', function () {
      expect(this.card.get('cvv.isValid')).to.equal(false);
      expect(this.card.get('cvv.isPotentiallyValid')).to.equal(true);

      this.card.set('possibleCardTypes', [{code: {size: 3}}]);

      expect(this.card.get('cvv.isValid')).to.equal(false);
      expect(this.card.get('cvv.isPotentiallyValid')).to.equal(true);

      this.card.set('cvv.value', '1234');

      expect(this.card.get('cvv.isValid')).to.equal(false);
      expect(this.card.get('cvv.isPotentiallyValid')).to.equal(false);

      this.card.set('possibleCardTypes', [{code: {size: 4}}]);

      expect(this.card.get('cvv.isValid')).to.equal(true);
      expect(this.card.get('cvv.isPotentiallyValid')).to.equal(true);
    });

    it('emits a CARD_TYPE_CHANGE event', function () {
      var i;
      var callCount = 0;

      this.sandbox.stub(this.card, 'emitEvent');

      this.card.set('number.value', '4111111111111111');
      this.card.set('number.value', '');
      this.card.set('number.value', '378282246310005');

      expect(this.card.emitEvent).to.have.been.calledWith('number', externalEvents.CARD_TYPE_CHANGE);

      for (i = 0; i < this.card.emitEvent.callCount; i++) {
        if (this.card.emitEvent.getCall(i).args[1] === externalEvents.CARD_TYPE_CHANGE) {
          callCount++;
        }
      }
      expect(callCount).to.equal(3);
    });
  });

  describe('field empty change', function () {
    beforeEach(function () {
      this.sandbox.stub(this.card, 'emitEvent');
    });

    it('emits an EMPTY event', function () {
      this.card.set('number.value', '4');
      this.card.set('number.value', '');

      expect(this.card.emitEvent).to.have.been.calledWith('number', externalEvents.EMPTY);
    });

    it('emits a NOT_EMPTY event', function () {
      this.card.set('number.value', '4');

      expect(this.card.emitEvent).to.have.been.calledWith('number', externalEvents.NOT_EMPTY);
    });
  });
});
