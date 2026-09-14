const _default = {
  generate: vi.fn().mockReturnValue(document.createDocumentFragment()),
  destroy: vi.fn(),
  matchFocusElement: vi.fn(),
};

export const { generate, destroy, matchFocusElement } = _default;

export default _default;
