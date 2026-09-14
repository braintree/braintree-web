const _default = {
  createMandate: vi.fn(),
  openPopup: vi.fn(),
  handleApproval: vi.fn(),
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 570,
  redirectPage: vi.fn(),
  handleApprovalForFullPageRedirect: vi.fn(),
};

export const {
  createMandate,
  openPopup,
  handleApproval,
  POPUP_WIDTH,
  POPUP_HEIGHT,
  redirectPage,
  handleApprovalForFullPageRedirect,
} = _default;

export default _default;
