const _default = {
  loadScript: vi.fn().mockResolvedValue(),
  loadFastlane: vi.fn().mockResolvedValue(),
};

export const { loadScript, loadFastlane } = _default;

export default _default;
