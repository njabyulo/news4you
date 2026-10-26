// @vitest-environment jsdom
import { Landing } from "../src/features/public/components/LandingPage";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: true,
  auth: { isLoading: false, isAuthenticated: false, error: undefined },
}));

vi.mock("../src/config/auth", () => ({
  get configured() {
    return mocks.configured;
  },
}));

vi.mock("@auth0/auth0-react", () => ({ useAuth0: () => mocks.auth }));

let container: HTMLDivElement;

let root: Root;

async function render() {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={["/previous", "/"]} initialIndex={1}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/today" element={<Today />} />
          <Route path="/previous" element={<p>Previous page</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

function Today() {
  const navigate = useNavigate();
  return (
    <>
      <p>Today’s edition</p>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}

beforeEach(() => {
  mocks.configured = true;
  mocks.auth = { isLoading: false, isAuthenticated: false, error: undefined };
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

describe("home page authentication routing", () => {
  it("redirects signed-in readers to Today and replaces the home history entry", async () => {
    mocks.auth.isAuthenticated = true;
    await render();
    expect(container.textContent).toContain("Today’s edition");
    await act(async () => container.querySelector("button")!.click());
    expect(container.textContent).toBe("Previous page");
  });
  it("waits for session restoration without flashing the landing page", async () => {
    mocks.auth.isLoading = true;
    await render();
    expect(container.textContent).toContain("Opening your reading room");
    expect(container.textContent).not.toContain("Make it yours");
  });
  it("shows the landing page to signed-out visitors", async () => {
    await render();
    expect(container.textContent).toContain("Make it yours");
  });
  it("keeps the public page accessible when Auth0 is not configured", async () => {
    mocks.configured = false;
    mocks.auth.isLoading = true;
    await render();
    expect(container.textContent).toContain("Sign-in setup pending");
  });
});
