const _default = {
  runWebLogin: vi.fn(),
  openPopup: vi.fn(),
  setupDesktopWebLogin: vi.fn().mockResolvedValue({}),
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 570,
};

export const {
  runWebLogin,
  openPopup,
  setupDesktopWebLogin,
  POPUP_WIDTH,
  POPUP_HEIGHT,
} = _default;

export default _default;
