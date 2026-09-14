const _default = {
  isAndroid: vi.fn(),
  isChromeOS: vi.fn(),
  isChromeIos: vi.fn(),
  isFirefox: vi.fn(),
  isIos: vi.fn(),
  isIosWebview: vi.fn(),
  isSafari: vi.fn(),
  isIosSafari: vi.fn(),
  hasSoftwareKeyboard: vi.fn(),
};

export const {
  isAndroid,
  isChromeOS,
  isChromeIos,
  isFirefox,
  isIos,
  isIosWebview,
  isSafari,
  isIosSafari,
  hasSoftwareKeyboard,
} = _default;

export default _default;
