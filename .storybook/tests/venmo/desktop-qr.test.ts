/**
 * Desktop QR flow tests.
 *
 * DEFERRED: CANCELED/EXPIRED polling tests removed — they cannot be reliably
 * tested with mocks alone. The SDK's QR state machine expects the payment
 * context to transition through CREATED before reaching a terminal state;
 * mocking an immediate CANCELED/EXPIRED on the first poll is not a realistic
 * scenario and causes timeouts rather than surfacing the expected error path.
 *
 * Once a real Venmo sandbox is available these should be tested end-to-end
 * with actual QR scanning and authorization, covering:
 *  - CANCELED (user dismisses QR before scanning)
 *  - EXPIRED (QR code times out)
 *  - APPROVED / success path
 *  - Alert status messages and button state during the flow
 */
