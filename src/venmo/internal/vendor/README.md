## Node QRCode

The node qrcode repo hasn't been updated in a while: https://github.com/soldair/node-qrcode

We've forked and updated the dependencies: https://github.com/braintree/node-qrcode

To bring in a new version, run the following in the node-qrcode repo:

```sh
npm run build
cp build/qrcode.js ../braintree.js/src/venmo/internal/vendor/node-qrcode.js
```
