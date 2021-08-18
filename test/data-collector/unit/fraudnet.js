'use strict';

jest.mock('../../../src/lib/assets', () => ({ loadScript: () => Promise.resolve() }));

const fraudNet = require('../../../src/data-collector/fraudnet');

describe('FraudNet', () => {
  afterEach(() => {
    fraudNet.clearSessionIdCache();
    document.body.innerHTML = '';
  });

  it('appends a script type of "application/json" to the document', async () => {
    await fraudNet.setup();

    expect(document.querySelector('[fncls][type="application/json"]')).not.toBeNull();
  });

  it('contains expected values in parsed data', async () => {
    const result = await fraudNet.setup();

    const sessionId = result.sessionId;
    const el = document.querySelector('[fncls][type="application/json"]');
    const parsedData = JSON.parse(el.text);

    expect(parsedData.b).toContain(sessionId);
    expect(parsedData.f).toBe(sessionId);
    expect(parsedData.s).toBe('BRAINTREE_SIGNIN');
    expect(parsedData.sandbox).toBe(true);
  });

  it('can pass a custom session id', async () => {
    const result = await fraudNet.setup({
      sessionId: 'session'
    });

    expect(result.sessionId).toBe('session');
  });

  it('re-uses session id when initialized more than once', async () => {
    const instance = await fraudNet.setup();

    const originalSessionId = instance.sessionId;

    instance.teardown();

    const newInstance = await fraudNet.setup();

    expect(newInstance.sessionId).toBe(originalSessionId);
  });

  it('does not re-use custom session id when initialized more than once', async () => {
    await fraudNet.setup({
      sessionId: 'custom-session'
    });

    const noCustomIdInstance = await fraudNet.setup();

    expect(noCustomIdInstance.sessionId).not.toBe('custom-session');
  });

  it('does not re-use id when instantiated with a new custom session id', async () => {
    const preCustomInstance = await fraudNet.setup();

    preCustomInstance.teardown();

    const firstCustomInstance = await fraudNet.setup({
      sessionId: 'custom-session'
    });

    expect(firstCustomInstance.sessionId).toBe('custom-session');
  });

  it('does not include a sandbox param when production env is passed', async () => {
    await fraudNet.setup({
      environment: 'production'
    });
    const scriptEl = document.querySelector('[fncls][type="application/json"]');
    const data = JSON.parse(scriptEl.text);

    expect(data).not.toHaveProperty('sandbox');
  });
});
