var FrameService = vi.fn();

FrameService.prototype.initialize = vi.fn().mockImplementation(function (cb) {
  if (cb) cb();
});
FrameService.prototype._writeDispatchFrame = vi.fn();
FrameService.prototype._setBusEvents = vi.fn();
FrameService.prototype.open = vi.fn();
FrameService.prototype.redirect = vi.fn();
FrameService.prototype.close = vi.fn();
FrameService.prototype.focus = vi.fn();
FrameService.prototype.teardown = vi.fn();
FrameService.prototype.isFrameClosed = vi.fn();
FrameService.prototype._cleanupFrame = vi.fn();
FrameService.prototype._pollForPopupClose = vi.fn();
FrameService.prototype._getFrameForEnvironment = vi.fn();

export default FrameService;
