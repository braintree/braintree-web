const _default = {
  getFrameName: function getFrameName() {
    return window.name.replace("braintree-hosted-field-", "");
  },
};

export const { getFrameName } = _default;

export default _default;
