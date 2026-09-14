var PopupBridge = vi.fn();

PopupBridge.prototype.initialize = vi.fn();
PopupBridge.prototype.open = vi.fn();
PopupBridge.prototype.focus = vi.fn();
PopupBridge.prototype.close = vi.fn();
PopupBridge.prototype.isClosed = vi.fn();
PopupBridge.prototype.redirect = vi.fn();

export default PopupBridge;
