var Modal = vi.fn();

Modal.prototype.initialize = vi.fn();
Modal.prototype.open = vi.fn();
Modal.prototype.focus = vi.fn();
Modal.prototype.close = vi.fn();
Modal.prototype.isClosed = vi.fn();
Modal.prototype.redirect = vi.fn();

export default Modal;
