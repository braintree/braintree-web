'use strict';

const validator = require('card-validator');
const { CreditCardForm } = require('../../../../../src/hosted-fields/internal/models/credit-card-form');
const getCardTypes = require('../../../../../src/hosted-fields/shared/get-card-types');
const { events, externalEvents } = require('../../../../../src/hosted-fields/shared/constants');
const { getModelConfig } = require('../../helpers');
const nextYear = (new Date().getFullYear() + 1).toString();

describe('credit card model', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.card = new CreditCardForm(getModelConfig([
      'number',
      'cvv',
      'expirationDate',
      'postalCode'
    ]));
  });

  it('starts with empty values', () => {
    expect(testContext.card.get('number').value).toBe('');
    expect(testContext.card.get('cvv').value).toBe('');
    expect(testContext.card.get('expirationDate').value).toBe('');
    expect(testContext.card.get('postalCode').value).toBe('');
  });

  describe('constructor()', () => {
    beforeEach(() => {
      jest.spyOn(CreditCardForm.prototype, 'on');
    });

    describe('_fieldKeys', () => {
      it('sets a _fieldKeys property', () => {
        const cardForm = new CreditCardForm(getModelConfig());

        expect(cardForm._fieldKeys).toBeDefined();
      });

      it('assigns only allowed fields', () => {
        const cardForm = new CreditCardForm(getModelConfig([
          'number',
          'foo'
        ]));

        expect(cardForm._fieldKeys).toEqual(['number']);
      });
    });

    it('sets a configuration property', () => {
      const configuration = getModelConfig();
      const cardForm = new CreditCardForm(configuration);

      expect(cardForm.configuration).toBe(configuration);
    });

    it('does set supportedCardTypes when specified', () => {
      const configuration = getModelConfig();

      configuration.supportedCardTypes = ['VISA'];

      jest.spyOn(CreditCardForm.prototype, 'setSupportedCardTypes');

      new CreditCardForm(configuration); // eslint-disable-line no-new

      expect(CreditCardForm.prototype.setSupportedCardTypes).toHaveBeenCalledTimes(1);
      expect(CreditCardForm.prototype.setSupportedCardTypes).toHaveBeenCalledWith(['VISA']);
    });

    it('attaches change events for each field (cvv only)', () => {
      const configuration = getModelConfig();
      const cardForm = new CreditCardForm(configuration);
      const { calls } = cardForm.on.mock;

      expect(cardForm.on).toHaveBeenCalledTimes(8);

      // CVV is the only field by default
      expect(calls[0][0]).toBe('change:cvv.value');
      expect(calls[0][1]).toBeInstanceOf(Function);
      expect(calls[1][0]).toBe('change:cvv.isFocused');
      expect(calls[1][1]).toBeInstanceOf(Function);
      expect(calls[2][0]).toBe('change:cvv.isEmpty');
      expect(calls[2][1]).toBeInstanceOf(Function);
      expect(calls[3][0]).toBe('change:cvv.isValid');
      expect(calls[3][1]).toBeInstanceOf(Function);
      expect(calls[4][0]).toBe('change:cvv.isPotentiallyValid');
      expect(calls[4][1]).toBeInstanceOf(Function);

      expect(calls[5][0]).toBe('change:number.value');
      expect(calls[5][1]).toBeInstanceOf(Function);
      expect(calls[6][0]).toBe('change:possibleCardTypes');
      expect(calls[6][1]).toBeInstanceOf(Function);
      expect(calls[7][0]).toBe('change:possibleCardTypes');
      expect(calls[7][1]).toBeInstanceOf(Function);
    });

    it('attaches change events for each field', () => {
      const configuration = getModelConfig([
        'number',
        'cvv',
        'expirationDate'
      ]);
      const cardForm = new CreditCardForm(configuration);
      const { calls } = cardForm.on.mock;

      expect(calls.length).toBe(18);

      expect(calls[0][0]).toBe('change:number.value');
      expect(calls[0][1]).toBeInstanceOf(Function);
      expect(calls[1][0]).toBe('change:number.isFocused');
      expect(calls[1][1]).toBeInstanceOf(Function);
      expect(calls[2][0]).toBe('change:number.isEmpty');
      expect(calls[2][1]).toBeInstanceOf(Function);
      expect(calls[3][0]).toBe('change:number.isValid');
      expect(calls[3][1]).toBeInstanceOf(Function);
      expect(calls[4][0]).toBe('change:number.isPotentiallyValid');
      expect(calls[4][1]).toBeInstanceOf(Function);

      expect(calls[5][0]).toBe('change:cvv.value');
      expect(calls[5][1]).toBeInstanceOf(Function);
      expect(calls[6][0]).toBe('change:cvv.isFocused');
      expect(calls[6][1]).toBeInstanceOf(Function);
      expect(calls[7][0]).toBe('change:cvv.isEmpty');
      expect(calls[7][1]).toBeInstanceOf(Function);
      expect(calls[8][0]).toBe('change:cvv.isValid');
      expect(calls[8][1]).toBeInstanceOf(Function);
      expect(calls[9][0]).toBe('change:cvv.isPotentiallyValid');
      expect(calls[9][1]).toBeInstanceOf(Function);

      expect(calls[10][0]).toBe('change:expirationDate.value');
      expect(calls[10][1]).toBeInstanceOf(Function);
      expect(calls[11][0]).toBe('change:expirationDate.isFocused');
      expect(calls[11][1]).toBeInstanceOf(Function);
      expect(calls[12][0]).toBe('change:expirationDate.isEmpty');
      expect(calls[12][1]).toBeInstanceOf(Function);
      expect(calls[13][0]).toBe('change:expirationDate.isValid');
      expect(calls[13][1]).toBeInstanceOf(Function);
      expect(calls[14][0]).toBe('change:expirationDate.isPotentiallyValid');
      expect(calls[14][1]).toBeInstanceOf(Function);

      expect(calls[15][0]).toBe('change:number.value');
      expect(calls[15][1]).toBeInstanceOf(Function);
      expect(calls[16][0]).toBe('change:possibleCardTypes');
      expect(calls[16][1]).toBeInstanceOf(Function);
      expect(calls[17][0]).toBe('change:possibleCardTypes');
      expect(calls[17][1]).toBeInstanceOf(Function);
    });
  });

  describe('resetAttributes', () => {
    beforeEach(() => {
      testContext.scope = {
        _fieldKeys: ['number', 'cvv', 'expirationMonth', 'expirationYear'],
        getCardTypes: CreditCardForm.prototype.getCardTypes,
        supportedCardTypes: ['visa'],
        configuration: {
          fields: {
            number: {},
            cvv: {},
            expirationMonth: {},
            expirationYear: {}
          }
        }
      };

      jest.spyOn(CreditCardForm.prototype, 'getCardTypes').mockReturnValue([]);

      testContext.emptyProperty = {
        value: '',
        isFocused: false,
        isValid: false,
        isPotentiallyValid: true,
        isEmpty: true
      };
    });

    it('returns the right object for each field', () => {
      expect(testContext.card.resetAttributes()).toEqual({
        number: testContext.emptyProperty,
        cvv: testContext.emptyProperty,
        expirationDate: testContext.emptyProperty,
        postalCode: testContext.emptyProperty,
        possibleCardTypes: []
      });
    });

    it('sets expiration month to current month if using a <select> and no placeholder', () => {
      const currentMonth = ((new Date()).getMonth() + 1).toString();  // eslint-disable-line no-extra-parens

      testContext.scope.configuration.fields.expirationMonth = { select: true };

      expect(CreditCardForm.prototype.resetAttributes.call(testContext.scope).expirationMonth).toEqual({
        value: currentMonth,
        isFocused: false,
        isValid: true,
        isPotentiallyValid: true,
        isEmpty: false
      });
    });

    it('sets expiration year to current year if using a <select> and no placeholder', () => {
      const currentYear = (nextYear - 1).toString();

      testContext.scope.configuration.fields.expirationYear = { select: true };

      expect(CreditCardForm.prototype.resetAttributes.call(testContext.scope).expirationYear).toEqual({
        value: currentYear,
        isFocused: false,
        isValid: true,
        isPotentiallyValid: true,
        isEmpty: false
      });
    });

    it('sets expiration month to empty if using a <select> and a placeholder', () => {
      testContext.scope.configuration.fields.expirationMonth = {
        select: true,
        placeholder: 'expiration month placeholder'
      };
      expect(CreditCardForm.prototype.resetAttributes.call(testContext.scope).expirationMonth).toEqual(testContext.emptyProperty);
    });

    it('sets expiration year to empty if using a <select> and a placeholder', () => {
      testContext.scope.configuration.fields.expirationYear = {
        select: true,
        placeholder: 'expiration year placeholder'
      };
      expect(CreditCardForm.prototype.resetAttributes.call(testContext.scope).expirationYear).toEqual(testContext.emptyProperty);
    });
  });

  describe('emitEvent', () => {
    it('sends the proper form data', () => {
      const fakeData = {
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
        get(property) {
          return fakeData[property];
        },
        _fieldKeys: [
          'number',
          'cvv',
          'expirationDate'
        ]
      }, 'number', 'foo');

      expect(window.bus.emit).toHaveBeenCalledWith(events.INPUT_EVENT, expect.any(Object));
      expect(window.bus.emit.mock.calls[0][1]).toMatchObject({
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
      });
    });

    it('sends an empty array if there are 0 possible card types', () => {
      CreditCardForm.prototype.emitEvent.call({
        get(property) {
          if (property === 'possibleCardTypes') {
            return [];
          }

          return {};
        },
        _fieldKeys: []
      }, 'number', 'foo');

      expect(window.bus.emit).toHaveBeenCalledWith(events.INPUT_EVENT, expect.any(Object));
      expect(window.bus.emit.mock.calls[0][1]).toMatchObject({
        merchantPayload: {
          cards: [],
          emittedBy: 'number',
          fields: {}
        },
        type: 'foo'
      });
    });

    it('sends an array of possible cards if there are more than 1 possible card types', () => {
      const cards = [
        {
          niceType: 'Visa',
          type: 'visa',
          code: {
            size: 3,
            name: 'CVV'
          },
          gaps: [3, 7, 11],
          supported: true
        },
        {
          niceType: 'Discover',
          type: 'discover',
          code: {
            size: 3,
            name: 'CID'
          },
          gaps: [3, 7, 11],
          supported: true
        }
      ];

      CreditCardForm.prototype.emitEvent.call({
        get(property) {
          if (property === 'possibleCardTypes') {
            return cards;
          }

          return {};
        },
        _fieldKeys: []
      }, 'number', 'foo');

      expect(window.bus.emit).toHaveBeenCalledWith(events.INPUT_EVENT, expect.any(Object));
      expect(window.bus.emit.mock.calls[0][1]).toMatchObject({
        merchantPayload: {
          cards: cards.map(card => ({
            niceType: card.niceType,
            type: card.type,
            code: card.code,
            supported: true
          })),
          emittedBy: 'number',
          fields: {}
        },
        type: 'foo'
      });
    });

    it('sends a card if there is 1 possible card type', () => {
      CreditCardForm.prototype.emitEvent.call({
        get(property) {
          if (property === 'possibleCardTypes') {
            return [{
              niceType: 'Visa',
              type: 'visa',
              code: {
                size: 3,
                name: 'CVV'
              },
              gaps: [3, 7, 11],
              supported: true
            }];
          }

          return {};
        },
        _fieldKeys: []
      }, 'number', 'foo');

      expect(window.bus.emit).toHaveBeenCalledWith(events.INPUT_EVENT, expect.any(Object));
      expect(window.bus.emit.mock.calls[0][1]).toMatchObject({
        merchantPayload: {
          cards: [{
            niceType: 'Visa',
            type: 'visa',
            code: {
              size: 3,
              name: 'CVV'
            },
            supported: true
          }],
          emittedBy: 'number',
          fields: {}
        },
        type: 'foo'
      });
    });

    it('emits CARD_FORM_ENTRY_HAS_BEGUN when field is focused the first time', () => {
      const card = new CreditCardForm(getModelConfig([
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      card._resetCardFormHasStartedBeingFilled();

      card.set('cvv.isFocused', true);

      expect(window.bus.emit).toHaveBeenCalledWith(events.CARD_FORM_ENTRY_HAS_BEGUN);

      window.bus.emit.mockReset();

      card.set('cvv.isFocused', false);
      card.set('cvv.isFocused', true);

      expect(window.bus.emit).not.toHaveBeenCalledWith(events.CARD_FORM_ENTRY_HAS_BEGUN);
    });
  });

  describe('getCardData', () => {
    it('gets credit card number', () => {
      testContext.card.set('number.value', '4111111111111111');
      expect(testContext.card.getCardData().number).toBe('4111111111111111');

      testContext.card.set('number.value', '');
      expect(testContext.card.getCardData().number).toBe('');
    });

    it('skips credit card number if not in the config', () => {
      const card = new CreditCardForm(getModelConfig([
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      expect(card.getCardData().number).toBeUndefined();
      card.set('number.value', '4111111111111111');
      expect(card.getCardData().number).toBeUndefined();
      card.set('number.value', '');
      expect(card.getCardData().number).toBeUndefined();
    });

    it('skips fields if explicit fields are passed', () => {
      testContext.card.set('number.value', '4111111111111111');
      testContext.card.set('cvv.value', '123');
      expect(testContext.card.getCardData(['cvv']).number).toBeFalsy();
      expect(testContext.card.getCardData(['cvv']).cvv).toBe('123');
    });

    it('skips CVV if not in the config', () => {
      const card = new CreditCardForm(getModelConfig([
        'number',
        'expirationMonth',
        'expirationYear'
      ]));

      expect(card.getCardData().cvv).toBeUndefined();
      card.set('cvv.value', '123');
      expect(card.getCardData().cvv).toBeUndefined();
      card.set('cvv.value', '');
      expect(card.getCardData().cvv).toBeUndefined();
    });

    it('gets CVV if specified in the config', () => {
      testContext.card.set('cvv.value', '123');
      expect(testContext.card.getCardData().cvv).toBe('123');

      testContext.card.set('cvv.value', '');
      expect(testContext.card.getCardData().cvv).toBe('');
    });

    it('gets cardholder name if specified in the config', () => {
      const card = new CreditCardForm(getModelConfig([
        'number',
        'cardholderName'
      ]));

      card.set('cardholderName.value', 'Given Sur');
      expect(card.getCardData().cardholderName).toBe('Given Sur');
      card.set('cardholderName.value', '');
      expect(card.getCardData().cardholderName).toBe('');
    });

    it('can get expiration month and year from the expirationDate', () => {
      let cardData;

      testContext.card.set('expirationDate.value', `10${nextYear}`);
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('10');
      expect(cardData.expirationYear).toBe(nextYear);

      testContext.card.set('expirationDate.value', `01${nextYear}`);
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('01');
      expect(cardData.expirationYear).toBe(nextYear);

      testContext.card.set('expirationDate.value', '');
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('');
      expect(cardData.expirationYear).toBe('');
    });

    it('ignores spaces, slashes, and hyphens in expirationDate', () => {
      let cardData;

      testContext.card.set('expirationDate.value', `1 - 0 / ${nextYear}`);
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('10');
      expect(cardData.expirationYear).toBe(nextYear);

      testContext.card.set('expirationDate.value', `  ---  0/-///1 ${nextYear}`);
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('01');
      expect(cardData.expirationYear).toBe(nextYear);

      testContext.card.set('expirationDate.value', `12 / ${nextYear}`);
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('12');
      expect(cardData.expirationYear).toBe(nextYear);

      testContext.card.set('expirationDate.value', `2 - ${nextYear}`);
      cardData = testContext.card.getCardData();
      expect(cardData.expirationMonth).toBe('02');
      expect(cardData.expirationYear).toBe(nextYear);
    });

    it('skips expiration if neither are in the config', () => {
      const card = new CreditCardForm(getModelConfig([
        'number'
      ]));

      expect(card.getCardData().expirationYear).toBeUndefined();
      card.set('expirationYear.value', '2020');
      expect(card.getCardData().expirationYear).toBeUndefined();
      card.set('expirationYear.value', '');
      expect(card.getCardData().expirationYear).toBeUndefined();

      expect(card.getCardData().expirationMonth).toBeUndefined();
      card.set('expirationMonth.value', '2020');
      expect(card.getCardData().expirationMonth).toBeUndefined();
      card.set('expirationMonth.value', '');
      expect(card.getCardData().expirationMonth).toBeUndefined();

      expect(card.getCardData().expirationDate).toBeUndefined();
      card.set('expirationDate.value', '2020');
      expect(card.getCardData().expirationDate).toBeUndefined();
      card.set('expirationDate.value', '');
      expect(card.getCardData().expirationDate).toBeUndefined();
    });

    it('can get expiration month and year if expirationDate is not specified', () => {
      let cardData;
      const card = new CreditCardForm(getModelConfig([
        'number',
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      card.set('expirationMonth.value', '10');
      card.set('expirationYear.value', nextYear);
      cardData = card.getCardData();
      expect(cardData.expirationMonth).toBe('10');
      expect(cardData.expirationYear).toBe(nextYear);

      card.set('expirationMonth.value', '');
      card.set('expirationYear.value', nextYear);
      cardData = card.getCardData();
      expect(cardData.expirationMonth).toBe('');
      expect(cardData.expirationYear).toBe(nextYear);

      card.set('expirationMonth.value', '02');
      card.set('expirationYear.value', '');
      cardData = card.getCardData();
      expect(cardData.expirationMonth).toBe('02');
      expect(cardData.expirationYear).toBe('');

      card.set('expirationMonth.value', '');
      card.set('expirationYear.value', '');
      cardData = card.getCardData();
      expect(cardData.expirationMonth).toBe('');
      expect(cardData.expirationYear).toBe('');

      card.set('expirationMonth.value', '13');
      card.set('expirationYear.value', '1920');
      cardData = card.getCardData();
      expect(cardData.expirationMonth).toBe('13');
      expect(cardData.expirationYear).toBe('1920');
    });

    it('gets postal code if present', () => {
      testContext.card.set('postalCode.value', '6061b');
      expect(testContext.card.getCardData().postalCode).toBe('6061b');

      testContext.card.set('postalCode.value', '');
      expect(testContext.card.getCardData().postalCode).toBe('');
    });

    it('skips postal code if not present in the configuration', () => {
      const card = new CreditCardForm(getModelConfig([
        'number',
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]));

      expect(card.getCardData().postalCode).toBeUndefined();

      card.set('postalCode.value', '6061b');
      expect(card.getCardData().postalCode).toBeUndefined();

      card.set('postalCode.value', '');
      expect(card.getCardData().postalCode).toBeUndefined();
    });
  });

  describe('getCardTypes', () => {
    it('returns a list of card types', () => {
      const mastercardOrMaestroCard = '5';
      const expected = getCardTypes(mastercardOrMaestroCard);
      const actual = testContext.card.getCardTypes(mastercardOrMaestroCard);

      expect(actual.length).toBe(expected.length);
      expect(actual[0].type).toEqual(expected[0].type);
      expect(actual[1].type).toEqual(expected[1].type);
      expect(actual[2].type).toEqual(expected[2].type);
    });

    it('sets supported for supported card types', () => {
      const discoverOrMaestroCard = '60';
      const context = {
        supportedCardTypes: ['discover']
      };
      const cardTypes = CreditCardForm.prototype.getCardTypes.call(
        context,
        discoverOrMaestroCard
      );

      expect(cardTypes.length).toBe(3);
      expect(cardTypes[0].niceType).toBe('Discover');
      expect(cardTypes[0].type).toBe('discover');
      expect(cardTypes[0].supported).toBe(true);
      expect(cardTypes[1].niceType).toBe('Maestro');
      expect(cardTypes[1].type).toBe('maestro');
      expect(cardTypes[1].supported).toBe(false);
      expect(cardTypes[2].niceType).toBe('Hipercard');
      expect(cardTypes[2].type).toBe('hipercard');
      expect(cardTypes[2].supported).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('returns true when fields are empty', () => {
      expect(testContext.card.isEmpty()).toBe(true);
    });

    it('returns true when fields are set to empty', () => {
      testContext.card.set('number.value', '');
      testContext.card.set('cvv.value', '');
      testContext.card.set('expirationDate.value', '');
      testContext.card.set('postalCode.value', '');

      expect(testContext.card.isEmpty()).toBe(true);
    });

    it('returns false when fields are filled', () => {
      testContext.card.set('number.value', '4111111111111111');
      testContext.card.set('cvv.value', '123');
      testContext.card.set('expirationDate.value', `07${nextYear}`);
      testContext.card.set('postalCode.value', '30303');

      expect(testContext.card.isEmpty()).toBe(false);
    });

    it('returns false when some fields are empty', () => {
      testContext.card.set('number.value', '');
      testContext.card.set('cvv.value', '');
      testContext.card.set('expirationDate.value', `07${nextYear}`);
      testContext.card.set('postalCode.value', '30303');

      expect(testContext.card.isEmpty()).toBe(false);
    });

    it('returns true when passed in fields are empty, but non-passed in fields are not', () => {
      testContext.card.set('number.value', '');
      testContext.card.set('cvv.value', '');
      testContext.card.set('expirationDate.value', `07${nextYear}`);
      testContext.card.set('postalCode.value', '30303');

      expect(testContext.card.isEmpty(['cvv'])).toBe(true);
    });
  });

  describe('invalidFieldKeys', () => {
    it('returns invalid keys when all fields are invalid', () => {
      testContext.card.set('number.value', 'not-a-card-number');
      testContext.card.set('cvv.value', 'not-a-cvv');
      testContext.card.set('expirationDate.value', '041789');
      testContext.card.set('postalCode.value', '');

      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['number']));
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['cvv']));
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['expirationDate']));
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['postalCode']));
    });

    it('returns only invalid keys when some keys are invalid', () => {
      testContext.card.set('number.value', '4111111111111111');
      testContext.card.set('cvv.value', '123');
      testContext.card.set('expirationDate.value', '041789');
      testContext.card.set('postalCode.value', '');

      expect(testContext.card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['number']));
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['cvv']));
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['expirationDate']));
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['postalCode']));
    });

    it('returns an empty array when all keys are valid', () => {
      testContext.card.set('number.value', '4111111111111111');
      testContext.card.set('cvv.value', '123');
      testContext.card.set('expirationDate.value', `07${nextYear}`);
      testContext.card.set('postalCode.value', '30305');

      expect(testContext.card.invalidFieldKeys()).toHaveLength(0);
      expect(testContext.card.invalidFieldKeys()).toBeInstanceOf(Array);
    });

    it('marks postal code as invalid if set minlength is not reached', () => {
      testContext.card.set('postalCode.value', '303');

      expect(testContext.card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['postalCode']));

      testContext.card.configuration.fields.postalCode.minlength = 4;
      testContext.card.set('postalCode.value', '123');
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.arrayContaining(['postalCode']));

      testContext.card.set('postalCode.value', '4321');
      expect(testContext.card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['postalCode']));
    });

    it('marks cvv as invalid if set minlength is not reached in cvv only integration', () => {
      const card = new CreditCardForm(getModelConfig([
        'cvv'
      ]));

      card.set('cvv.value', '123');

      expect(card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['cvv']));

      card.configuration.fields.cvv.minlength = 4;
      card.set('cvv.value', '321');
      expect(card.invalidFieldKeys()).toEqual(expect.arrayContaining(['cvv']));

      card.set('cvv.value', '1234');
      expect(card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['cvv']));
    });

    it('ignores cvv minlength in non-cvv only integration', () => {
      testContext.card.configuration.fields.cvv.minlength = 4;
      testContext.card.set('cvv.value', '123');

      expect(testContext.card.invalidFieldKeys()).toEqual(expect.not.arrayContaining(['cvv']));
    });

    it('returns subset of invalid keys when all fields are invalid, but specific keys are passed in', () => {
      let result;

      testContext.card.set('number.value', 'not-a-card-number');
      testContext.card.set('cvv.value', 'not-a-cvv');
      testContext.card.set('expirationDate.value', '041789');
      testContext.card.set('postalCode.value', '');

      result = testContext.card.invalidFieldKeys(['number', 'postalCode']);

      expect(result.length).toBe(2);
      expect(result).toEqual(expect.arrayContaining(['number']));
      expect(result).toEqual(expect.not.arrayContaining(['cvv']));
      expect(result).toEqual(expect.not.arrayContaining(['expirationDate']));
      expect(result).toEqual(expect.arrayContaining(['postalCode']));
    });

    it('ignores keys that do not exist within card form', () => {
      let result;

      testContext.card.set('number.value', 'not-a-card-number');
      testContext.card.set('cvv.value', 'not-a-cvv');
      testContext.card.set('expirationDate.value', '041789');
      testContext.card.set('postalCode.value', '');

      result = testContext.card.invalidFieldKeys(['foo', 'number', 'bar', 'postalCode', 'baz']);

      expect(result.length).toBe(2);
      expect(result).toEqual(expect.arrayContaining(['number']));
      expect(result).toEqual(expect.not.arrayContaining(['cvv']));
      expect(result).toEqual(expect.not.arrayContaining(['expirationDate']));
      expect(result).toEqual(expect.arrayContaining(['postalCode']));
    });
  });

  describe('possibleCardTypes', () => {
    it.each([
      '4', '411', '4111111111111111', '5555', '5555555555554444', '378', '378282246310005', ''
    ])('changes credit card type when the number changes to %p', num => {
      testContext.card.set('number.value', num);

      const types = testContext.card.get('possibleCardTypes');
      const number = testContext.card.get('number').value;
      const typesForNumber = getCardTypes(number);

      expect(typesForNumber.length).toBeGreaterThan(0);

      typesForNumber.forEach((card, index) => {
        expect(card.type).toBe(types[index].type);
      });
    });

    it('validates CVV', () => {
      testContext.card.set('possibleCardTypes', [
        { code: { size: 3 }},
        { code: { size: 4 }}
      ]);

      expect(testContext.card.get('cvv.isValid')).toBe(false);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(true);

      testContext.card.set('cvv.value', '123');

      expect(testContext.card.get('cvv.isValid')).toBe(true);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(true);

      testContext.card.set('cvv.value', '1234');

      expect(testContext.card.get('cvv.isValid')).toBe(true);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(true);

      testContext.card.set('cvv.value', '12345');

      expect(testContext.card.get('cvv.isValid')).toBe(false);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(false);
    });

    it('revalidates CVV when possibleCardTypes changes', () => {
      expect(testContext.card.get('cvv.isValid')).toBe(false);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(true);

      testContext.card.set('possibleCardTypes', [{ code: { size: 3 }}]);

      expect(testContext.card.get('cvv.isValid')).toBe(false);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(true);

      testContext.card.set('cvv.value', '1234');

      expect(testContext.card.get('cvv.isValid')).toBe(false);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(false);

      testContext.card.set('possibleCardTypes', [{ code: { size: 4 }}]);

      expect(testContext.card.get('cvv.isValid')).toBe(true);
      expect(testContext.card.get('cvv.isPotentiallyValid')).toBe(true);
    });

    it('emits a CARD_TYPE_CHANGE event', () => {
      let i;
      let callCount = 0;

      jest.spyOn(testContext.card, 'emitEvent');

      testContext.card.set('number.value', '4111111111111111');
      testContext.card.set('number.value', '');
      testContext.card.set('number.value', '378282246310005');

      expect(testContext.card.emitEvent).toHaveBeenCalledWith('number', externalEvents.CARD_TYPE_CHANGE);

      for (i = 0; i < testContext.card.emitEvent.mock.calls.length; i++) {
        if (testContext.card.emitEvent.mock.calls[i][1] === externalEvents.CARD_TYPE_CHANGE) {
          callCount++;
        }
      }
      expect(callCount).toBe(3);
    });

    it('emits a VALIDITY_CHANGE event', () => {
      let i;
      let callCount = 0;

      jest.spyOn(testContext.card, 'emitEvent');

      testContext.card.set('number.value', '');
      testContext.card.set('number.value', '411111111111111');
      testContext.card.set('number.value', '4111111111111111');
      testContext.card.set('number.value', '411111111111111123');

      expect(testContext.card.emitEvent).toHaveBeenCalledWith('number', externalEvents.VALIDITY_CHANGE);

      for (i = 0; i < testContext.card.emitEvent.mock.calls.length; i++) {
        if (testContext.card.emitEvent.mock.calls[i][1] === externalEvents.VALIDITY_CHANGE) {
          callCount++;
        }
      }
      expect(callCount).toBe(2);
    });

    describe('supporting card types', () => {
      beforeEach(() => {
        const config = Object.assign({}, getModelConfig(['number']), {
          supportedCardTypes: {
            Discover: true
          }
        });

        testContext.supportedCardForm = new CreditCardForm(config);
      });

      it('sets supported property for all card types', () => {
        const possibleCardTypes = testContext.supportedCardForm.get('possibleCardTypes');

        possibleCardTypes.forEach(cardType => {
          if (cardType.type === 'discover') {
            expect(cardType.supported).toBe(true);
          } else {
            expect(cardType.supported).toBe(false);
          }
        });
      });

      it('sets number to potentially valid after removing an unsupported card number', () => {
        const visa = '41';
        const empty = '';

        testContext.supportedCardForm.set('number.value', visa);
        expect(testContext.supportedCardForm.get('number.value')).toBe(visa);
        expect(testContext.supportedCardForm.get('number.isValid')).toBe(false);
        expect(testContext.supportedCardForm.get('number.isPotentiallyValid')).toBe(false);

        testContext.supportedCardForm.set('number.value', empty);
        expect(testContext.supportedCardForm.get('number.value')).toBe(empty);
        expect(testContext.supportedCardForm.get('number.isValid')).toBe(false);
        expect(testContext.supportedCardForm.get('number.isPotentiallyValid')).toBe(true);
      });

      it('is not valid nor potentially valid when using an unsupported card type', () => {
        const mastercard = '5555555555554444';

        testContext.supportedCardForm.set('number.value', mastercard);
        expect(testContext.supportedCardForm.get('number.value')).toBe(mastercard);
        expect(testContext.supportedCardForm.get('number.isValid')).toBe(false);
        expect(testContext.supportedCardForm.get('number.isPotentiallyValid')).toBe(false);
      });

      it('is valid and potentially valid when using a supported card type', () => {
        const discover = '6011000000000004';

        testContext.supportedCardForm.set('number.value', discover);
        expect(testContext.supportedCardForm.get('number.value')).toBe(discover);
        expect(testContext.supportedCardForm.get('number.isValid')).toBe(true);
        expect(testContext.supportedCardForm.get('number.isPotentiallyValid')).toBe(true);
      });
    });

    describe('luhn validity', () => {
      it('passes option to card validator', () => {
        const invalidCard = '6212345000000001';
        const config = Object.assign({}, getModelConfig(['number']), {
          supportedCardTypes: {
            UnionPay: true
          }
        });

        testContext.supportedCardForm = new CreditCardForm(config);
        jest.spyOn(validator, 'number');
        testContext.supportedCardForm.set('number.value', invalidCard);

        expect(validator.number).toHaveBeenCalledWith(invalidCard, { luhnValidateUnionPay: true });
      });
    });
  });

  describe('bin available', () => {
    it('emits BIN_AVAILABLE event when number goes from 5 digits to 6', () => {
      testContext.card.set('number.value', '41111');

      expect(window.bus.emit).not.toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE');

      testContext.card.set('number.value', '411111');

      expect(window.bus.emit).toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE', '411111');
    });

    it('emits BIN_AVAILABLE event when number goes from non-existent to 6 digits', () => {
      testContext.card.set('number.value', '411111');

      expect(window.bus.emit).toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE', '411111');
    });

    it('emits BIN_AVAILABLE event when number goes from non-existent to more than 6 digits', () => {
      testContext.card.set('number.value', '4111111111111');

      expect(window.bus.emit).toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE', '411111');
    });

    it('emits BIN_AVAILABLE event when number starts with more than 6 digits, dips below 6, and then receives 6 again', () => {
      testContext.card.set('number.value', '123456789');

      window.bus.emit.mockReset();

      testContext.card.set('number.value', '12345');
      expect(window.bus.emit).not.toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE');

      testContext.card.set('number.value', '123456');
      expect(window.bus.emit).toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE', '123456');
    });

    it('emits only the first 6 digits of the number when emitting even when more than 6 digits are set', () => {
      testContext.card.set('number.value', '1234567890');

      expect(window.bus.emit).toHaveBeenCalledWith('hosted-fields:BIN_AVAILABLE', '123456');
    });
  });

  describe('field empty change', () => {
    beforeEach(() => {
      jest.spyOn(testContext.card, 'emitEvent');
    });

    it('emits an EMPTY event', () => {
      testContext.card.set('number.value', '4');
      testContext.card.set('number.value', '');

      expect(testContext.card.emitEvent).toHaveBeenCalledWith('number', externalEvents.EMPTY);
    });

    it('emits a NOT_EMPTY event', () => {
      testContext.card.set('number.value', '4');

      expect(testContext.card.emitEvent).toHaveBeenCalledWith('number', externalEvents.NOT_EMPTY);
    });
  });

  describe('setSupportedCardTypes', () => {
    it('sets a supportedCardTypes property', () => {
      const configuration = getModelConfig();
      const cardForm = new CreditCardForm(configuration);

      cardForm.setSupportedCardTypes({
        VISA: true
      });

      expect(cardForm.supportedCardTypes).toEqual(['visa']);
    });

    it('defaults to call card types if no card types passed in', () => {
      const configuration = getModelConfig();
      const cardForm = new CreditCardForm(configuration);

      cardForm.setSupportedCardTypes();

      expect(cardForm.supportedCardTypes.length).toBeGreaterThan(9);
    });

    it('normalizes supportedCardTypes', () => {
      const configuration = getModelConfig();
      const supportedCardTypes = {
        discover: true,
        'Master-Card': true,
        VISA: true
      };
      const cardForm = new CreditCardForm(configuration);

      cardForm.setSupportedCardTypes(supportedCardTypes);
      expect(cardForm.supportedCardTypes).toEqual([
        'discover',
        'mastercard',
        'visa'
      ]);
    });
  });

  describe('applyAutofillValues', () => {
    it('emits autofill events for each applicable key card form is set up with', () => {
      const configuration = getModelConfig([
        'cardholderName',
        'number',
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]);
      const cardForm = new CreditCardForm(configuration);

      jest.spyOn(cardForm, '_emit');

      cardForm.applyAutofillValues({
        cardholderName: 'name',
        number: '4111',
        cvv: '123',
        expirationMonth: '12',
        expirationYear: '34'
      });

      expect(cardForm._emit).toBeCalledTimes(5);
      expect(cardForm._emit).toBeCalledWith('autofill:cardholderName', 'name');
      expect(cardForm._emit).toBeCalledWith('autofill:number', '4111');
      expect(cardForm._emit).toBeCalledWith('autofill:cvv', '123');
      expect(cardForm._emit).toBeCalledWith('autofill:expirationMonth', '12');
      expect(cardForm._emit).toBeCalledWith('autofill:expirationYear', '34');
    });

    it('does not emit event for key that does not exist in autofill data', () => {
      const configuration = getModelConfig(['number', 'postalCode']);
      const cardForm = new CreditCardForm(configuration);

      jest.spyOn(cardForm, '_emit');

      cardForm.applyAutofillValues({
        cardholderName: 'name',
        number: '4111',
        cvv: '123',
        expirationMonth: '12',
        expirationYear: '34'
      });

      expect(cardForm._emit).toBeCalledTimes(1);
      expect(cardForm._emit).toBeCalledWith('autofill:number', '4111');
    });

    it('emits expiration date autofill event with data from expiration month and year', () => {
      const configuration = getModelConfig(['expirationDate']);
      const cardForm = new CreditCardForm(configuration);

      jest.spyOn(cardForm, '_emit');

      cardForm.applyAutofillValues({
        cardholderName: 'name',
        number: '4111',
        cvv: '123',
        expirationMonth: '12',
        expirationYear: '34'
      });

      expect(cardForm._emit).toBeCalledTimes(1);
      expect(cardForm._emit).toBeCalledWith(
        'autofill:expirationDate',
        '12 / 34'
      );
    });

    it('does not emit expiration date autofill event when expiration month is missing', () => {
      const configuration = getModelConfig(['expirationDate']);
      const cardForm = new CreditCardForm(configuration);

      jest.spyOn(cardForm, '_emit');

      cardForm.applyAutofillValues({
        cardholderName: 'name',
        number: '4111',
        cvv: '123',
        expirationMonth: '',
        expirationYear: '34'
      });

      expect(cardForm._emit).not.toBeCalled();
    });

    it('does not emit expiration date autofill event when expiration year is missing', () => {
      const configuration = getModelConfig(['expirationDate']);
      const cardForm = new CreditCardForm(configuration);

      jest.spyOn(cardForm, '_emit');

      cardForm.applyAutofillValues({
        cardholderName: 'name',
        number: '4111',
        cvv: '123',
        expirationMonth: '12',
        expirationYear: ''
      });

      expect(cardForm._emit).not.toBeCalled();
    });

    it('does not emit event for value that is an empty string', () => {
      const configuration = getModelConfig([
        'cardholderName',
        'number',
        'cvv',
        'expirationMonth',
        'expirationYear'
      ]);
      const cardForm = new CreditCardForm(configuration);

      jest.spyOn(cardForm, '_emit');

      cardForm.applyAutofillValues({
        cardholderName: '',
        number: '4111',
        cvv: '',
        expirationMonth: '',
        expirationYear: ''
      });

      expect(cardForm._emit).toBeCalledTimes(1);
      expect(cardForm._emit).toBeCalledWith('autofill:number', '4111');
    });
  });
});
