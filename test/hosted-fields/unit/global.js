vi.mock("../../../src/lib/analytics");
vi.mock("framebus");
vi.mock("../../../src/lib/create-assets-url");

beforeEach(() => {
  console.warn = vi.fn();

  document.body.innerHTML = "";

  window.bus = {
    on: vi.fn(),
    emit: vi.fn(),
    target: vi.fn().mockReturnThis(),
  };
});

export default global;
