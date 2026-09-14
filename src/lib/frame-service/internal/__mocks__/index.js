import constants from "../../shared/constants";
export const asyncClose = vi.fn();
export const getFrame = vi.fn();
export const getServiceId = vi.fn();
export const report = vi.fn();
export { constants };

export default {
  asyncClose,
  constants,
  getFrame,
  getServiceId,
  report,
};
