'use strict';

jest.mock('../../../src/lib/assets', () => ({ loadScript: () => Promise.resolve() }));

const fraudNet = require('../../../src/data-collector/fraudnet');

describe('FraudNet', () => {
  let instance, el;
  let parsedData = {};

  beforeAll(() => fraudNet.setup().then(result => {
    instance = result;
    el = document.querySelector('[fncls][type="application/json"]');
    parsedData = JSON.parse(el.text);
  }));

  it('appends a script type of "application/json" to the document', () => {
    expect(el).not.toBeNull();
  });

  it('contains expected values in parsed data', () => {
    const sessionId = instance.sessionId;

    expect(parsedData.b).toContain(sessionId);
    expect(parsedData.f).toBe(sessionId);
    expect(parsedData.s).toBe('BRAINTREE_SIGNIN');
    expect(parsedData.sandbox).toBe(true);
  });

  it('re-uses session id when initialized more than once', () => {
    const originalSessionId = instance.sessionId;

    instance.teardown();

    return fraudNet.setup().then(result => {
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toBe(originalSessionId);
    });
  });

  it('does not include a sandbox param when production env is passed', () => {
    fraudNet.clearSessionIdCache();

    instance.teardown();

    return fraudNet.setup('production').then(() => {
      const scriptEl = document.querySelector('[fncls][type="application/json"]');
      const data = JSON.parse(scriptEl.text);

      expect(data).not.toHaveProperty('sandbox');
    });
  });
});
