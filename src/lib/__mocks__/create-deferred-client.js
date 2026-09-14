const _default = {
  create: vi.fn().mockImplementation(function (options) {
    return Promise.resolve(options && options.client ? options.client : {});
  }),
};

export const { create } = _default;

export default _default;
