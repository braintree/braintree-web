const _default = {
  detectIncognito: function () {
    return Promise.resolve({
      isPrivate: false,
      browserName: "test",
    });
  },
};

export const { detectIncognito } = _default;

export default _default;
