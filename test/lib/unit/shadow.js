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
    // this terrible test setup stuff is required because
    // jest doesn't recognize the sheet property of a
    // style element if it is inside the shadow DOM
    // so we have to tie ourselves into knots to
    // make fake elements in order to get any test coverage
    // on this. Also, this is going to be a big pain to
    // migrate to Typescript. Sorry future Aki and Blade!
    let fakeStyleNode, fakeSlot, fakeDiv;

    function mockDocumentCreateElement() {
      document.createElement.mockImplementation((tagName) => {
        switch (tagName) {
          case 'style':
            return fakeStyleNode;
          case 'slot':
            return fakeSlot;
          case 'div':
          default:
            return fakeDiv;
        }
      });
    }

    beforeEach(() => {
      fakeSlot = document.createElement('slot');
      fakeDiv = document.createElement('div');
      fakeStyleNode = document.createElement('style');
      jest.spyOn(document, 'createElement');
      Object.defineProperty(fakeStyleNode, 'sheet', {
        value: {
          insertRule: jest.fn()
        }
      });
    });

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

    // TODO JSDOM does not allow us to create shadow DOMs within a
    // shadow DOM, so this test can't actually run. Explore switching
    // out JSDOM in Jest for Chromium/Puppeteer to get a more reliable
    // browser API instead of the fake JSDOM implementation
    it.skip('supports deeply nested shadow elements', () => {
      const topLevelElement = document.createElement('div');
      const topLevelShadow = topLevelElement.attachShadow({ mode: 'open' });
      const midLevelElement = document.createElement('div');
      const midLevelShadow = topLevelElement.attachShadow({ mode: 'open' });
      const bottomLevelElement = document.createElement('div');
      const bottomLevelShadow = topLevelElement.attachShadow({ mode: 'open' });

      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <ul>
          <li class="active">Active el</li>
          <li>Not active</li>
        </ul>
      `;
      const li = wrapper.querySelector('.active');

      bottomLevelShadow.appendChild(wrapper);
      midLevelShadow.appendChild(bottomLevelElement);
      topLevelShadow.appendChild(midLevelElement);

      const slotProvider = shadow.transformToSlot(li);
      const topLevelSlotId = slotProvider.getAttribute('slot');

      expect(slotProvider).toBe(topLevelElement.querySelector(`[slot="${topLevelSlotId}"]`));

      const midLevelSlotId = midLevelElement.querySelector(`slot[name="${topLevelSlotId}"]`).parentNode.getAttribute('slot');
      const bottomLevelSlotId = bottomLevelElement.querySelector(`slot[name="${midLevelSlotId}"]`).parentNode.getAttribute('slot');

      expect(li.querySelector('slot').name).toBe(bottomLevelSlotId);
    });

    it('can add styles to the root node of the provided element', () => {
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

      mockDocumentCreateElement();
      const slotProvider = shadow.transformToSlot(li, 'height: 100%; background: red;');
      const id = slotProvider.getAttribute('slot');

      const style = wrapper.querySelector('style');

      expect(style).toBeTruthy();
      expect(style.sheet.insertRule).toBeCalledWith(`::slotted([slot="${id}"]) { height: 100%; background: red; }`);
    });

    it('adds only a single style node when called multiple times on the same shadow DOM', () => {
      const el = document.createElement('div');
      const shadowEl = el.attachShadow({ mode: 'open' });
      const wrapper = document.createElement('div');
      const secondFakeSlot = document.createElement('slot');
      const secondFakeDiv = document.createElement('div');

      wrapper.innerHTML = `
        <ul>
          <li class="active">Active el</li>
          <li class="not-active">Not active</li>
        </ul>
      `;
      const activeLi = wrapper.querySelector('.active');
      const notActiveLi = wrapper.querySelector('.not-active');

      shadowEl.appendChild(wrapper);

      mockDocumentCreateElement();
      const activeSlotProvider = shadow.transformToSlot(activeLi, 'color: red;');

      fakeSlot = secondFakeSlot;
      fakeDiv = secondFakeDiv;

      const notActiveSlotProvider = shadow.transformToSlot(notActiveLi, 'color: blue;');
      const activeId = activeSlotProvider.getAttribute('slot');
      const notActiveId = notActiveSlotProvider.getAttribute('slot');

      const styles = wrapper.querySelectorAll('style');

      expect(styles.length).toBe(1);

      const style = styles[0];

      expect(style).toBeTruthy();
      expect(style.sheet.insertRule).toBeCalledTimes(2);
      expect(style.sheet.insertRule).toBeCalledWith(`::slotted([slot="${activeId}"]) { color: red; }`);
      expect(style.sheet.insertRule).toBeCalledWith(`::slotted([slot="${notActiveId}"]) { color: blue; }`);
    });

    it('adds style to existing style node when a style element already exists', () => {
      const el = document.createElement('div');
      const shadowEl = el.attachShadow({ mode: 'open' });
      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <ul>
          <li class="active">Active el</li>
          <li>Not active</li>
        </ul>
      `;
      wrapper.appendChild(fakeStyleNode);
      const li = wrapper.querySelector('.active');
      const existingStyleNode = wrapper.querySelector('style');

      shadowEl.appendChild(wrapper);

      mockDocumentCreateElement();

      const slotProvider = shadow.transformToSlot(li, 'height: 100%; background: red;');
      const id = slotProvider.getAttribute('slot');

      const style = wrapper.querySelector('style');

      expect(style).toBe(existingStyleNode);
      expect(document.createElement).not.toBeCalledWith('style');
      expect(style.sheet.insertRule).toBeCalledWith(`::slotted([slot="${id}"]) { height: 100%; background: red; }`);
    });
  });
});
