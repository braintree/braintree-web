// Framebus must be a vi.fn() constructor so that:
// - instanceof checks work (_bus instanceof Framebus in FrameService tests)
// - mockImplementation() works (venmo-desktop.js tests)
// - prototype methods are vi.fn() for toHaveBeenCalled() assertions
var Framebus = vi.fn();

Framebus.prototype.on = vi.fn();
Framebus.prototype.off = vi.fn();
Framebus.prototype.emit = vi.fn();
Framebus.prototype.target = vi.fn().mockReturnThis();
Framebus.prototype.teardown = vi.fn();
Framebus.prototype.addTargetFrame = vi.fn();

export default Framebus;
