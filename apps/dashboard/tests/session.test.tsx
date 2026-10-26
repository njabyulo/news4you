// @vitest-environment jsdom
import { SessionBoundary } from "../src/features/auth/components/SessionBoundary";
import { useDraftValue } from "../src/hooks/useDraftValue";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string>>(),
  setTokenGetter: vi.fn(),
  dispatch: vi.fn(),
}));

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({ getAccessTokenSilently: mocks.getToken }),
}));

vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch }));

vi.mock("../src/state/store", () => ({
  setTokenGetter: mocks.setTokenGetter,
  api: { util: { resetApiState: () => ({ type: "reset-api" }) } },
}));

let container: HTMLDivElement;

let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const session = () => (
  <SessionBoundary loading={<p>Preparing</p>} error={<p>Sign in again</p>}>
    <p>Private newspaper</p>
  </SessionBoundary>
);

async function render(node: ReactNode) {
  await act(async () => root.render(node));
}

describe("session boundary", () => {
  it("keeps private queries unmounted until a usable token is available", async () => {
    let resolve!: (token: string) => void;
    mocks.getToken.mockReturnValue(
      new Promise<string>((done) => {
        resolve = done;
      }),
    );
    await render(session());
    expect(container.textContent).toBe("Preparing");
    expect(mocks.setTokenGetter).not.toHaveBeenCalled();
    await act(async () => resolve("test-only-token"));
    expect(container.textContent).toBe("Private newspaper");
    expect(await mocks.setTokenGetter.mock.calls[0][0]()).toBe("test-only-token");
    await act(async () => root.unmount());
    expect(mocks.setTokenGetter).toHaveBeenLastCalledWith(undefined);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "reset-api" });
    root = createRoot(container);
  });
  it("shows recovery instead of private content when token acquisition fails", async () => {
    mocks.getToken.mockRejectedValue(new Error("login_required"));
    await render(session());
    expect(container.textContent).toBe("Sign in again");
    expect(mocks.setTokenGetter).not.toHaveBeenCalled();
  });
  it("does not restore credentials when an unmounted session finishes late", async () => {
    let resolve!: (token: string) => void;
    mocks.getToken.mockReturnValue(
      new Promise<string>((done) => {
        resolve = done;
      }),
    );
    await render(session());
    await act(async () => root.unmount());
    mocks.setTokenGetter.mockClear();
    await act(async () => resolve("test-only-token"));
    expect(mocks.setTokenGetter).not.toHaveBeenCalled();
    root = createRoot(container);
  });
});

function DraftExample({ saved }: { saved: string }) {
  const [value, setValue] = useDraftValue(saved);
  return (
    <>
      <output>{value}</output>
      <button onClick={() => setValue("Unsaved choice")}>Edit</button>
    </>
  );
}

it("shows newly loaded settings but preserves unsaved edits during a refetch", async () => {
  await render(<DraftExample saved="Loading default" />);
  await render(<DraftExample saved="Saved choice" />);
  expect(container.querySelector("output")?.textContent).toBe("Saved choice");
  await act(async () => container.querySelector("button")!.click());
  await render(<DraftExample saved="Refetched choice" />);
  expect(container.querySelector("output")?.textContent).toBe("Unsaved choice");
});
