const _default = {
  isAndroid: vi.fn(),
  isAndroidWebview: vi.fn(),
  isChrome: vi.fn(),
  isIos: vi.fn(),
  isIosChrome: vi.fn(),
  isIosSafari: vi.fn(),
  isIosWebview: vi.fn(),
  isWebview: vi.fn(),
  isFacebookOwnedBrowserOnAndroid: vi.fn(),
  doesNotSupportWindowOpenInIos: vi.fn(),
  isIncognito: vi
    .fn()
    .mockResolvedValue({ isPrivate: false, browserName: "unknown" }),
};

export const {
  isAndroid,
  isAndroidWebview,
  isChrome,
  isIos,
  isIosChrome,
  isIosSafari,
  isIosWebview,
  isWebview,
  isFacebookOwnedBrowserOnAndroid,
  doesNotSupportWindowOpenInIos,
  isIncognito,
} = _default;

export default _default;
