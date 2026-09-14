const _default = {
  parse: vi.fn().mockReturnValue({}),
  stringify: vi.fn(),
  queryify: vi.fn(),
  hasQueryParams: vi.fn(),
};

export const { parse, stringify, queryify, hasQueryParams } = _default;

export default _default;
