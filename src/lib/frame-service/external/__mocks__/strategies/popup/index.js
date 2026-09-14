var Popup = vi.fn();

Popup.prototype.initialize = vi.fn();
Popup.prototype.open = vi.fn();
Popup.prototype.focus = vi.fn();
Popup.prototype.close = vi.fn();
Popup.prototype.isClosed = vi.fn();
Popup.prototype.redirect = vi.fn();

export default Popup;
