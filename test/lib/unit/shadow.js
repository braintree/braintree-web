'use strict';

const shadow = require('../../../src/lib/shadow');

describe('shadow', () => {
  describe('isShadowElement', () => {
    it('returns true when element is the shadow root', () => {
      const el = document.createElement('div');
      const shadowEl = el.attachShadow({ mode: 'open' });

      expect(shadow.isShadowElement(shadowEl)).toBe(true);
    });

    it('returns true when element is inside the shadow dom', () => {
      const el = document.createElement('div');
      const shadowEl = el.attachShadow({ mode: 'open' });
      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <ul>
          <li class="active">Active el</li>
          <li>Not active</li>
        </ul>
      `;

      shadowEl.appendChild(wrapper);

      expect(shadow.isShadowElement(wrapper.querySelector('.active'))).toBe(true);
    });

    it('returns false when element is not inside the shadow dom', () => {
      const el = document.createElement('div');

      expect(shadow.isShadowElement(el)).toBe(false);
    });
  });

  describe('getShadowHost', () => {
    it('returns the host of the shadow element', () => {
      const el = document.createElement('div');
      const shadowEl = el.attachShadow({ mode: 'open' });
      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <ul>
          <li class="active">Active el</li>
          <li>Not active</li>
        </ul>
      `;

      shadowEl.appendChild(wrapper);

      expect(shadow.getShadowHost(wrapper.querySelector('.active'))).toBe(el);
    });

    it('returns null if element is not in the shadow DOM', () => {
      expect(shadow.getShadowHost(document.createElement('div'))).toBe(null);
    });
  });

  describe('transformToSlot', () => {
    it('adds a slot element to element, a slot provider on the host and returns the slot provider', () => {
      const el = document.createElement('div');
      const shadowEl = el.attachShadow({ mode: 'open' });
      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <ul>
          <li class="active">Active el</li>
          <li>Not active</li>
        </ul>
      `;
      const li = wrapper.querySelector('.active');

      shadowEl.appendChild(wrapper);

      const slotProvider = shadow.transformToSlot(li);

      const id = slotProvider.getAttribute('slot');

      expect(slotProvider).toBe(el.querySelector(`[slot="${id}"]`));
      expect(li.querySelector('slot').name).toBe(id);
    });
  });
});
