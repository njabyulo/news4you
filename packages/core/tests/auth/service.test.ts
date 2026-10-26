import { authErrorMessage, createAuthService } from "@news4you/core/auth";
import type { TokenVerifier } from "@news4you/shared";
import { describe, expect, it, vi } from "vitest";

describe("injected authentication policy", () => {
  it("does not verify a request without a bearer token", async () => {
    const verifier = { verify: vi.fn<TokenVerifier["verify"]>() };
    const service = createAuthService({ verifier, publisherToken: "test-only" });
    expect(await service.reader(undefined)).toEqual({ kind: "missing" });
    expect(await service.reader("Basic wrong")).toEqual({ kind: "missing" });
    expect(verifier.verify).not.toHaveBeenCalled();
  });
  it("uses the injected verifier and returns the verified subject", async () => {
    const verifier = { verify: vi.fn<TokenVerifier["verify"]>().mockResolvedValue("reader-a") };
    expect(
      await createAuthService({ verifier, publisherToken: "" }).reader("Bearer test-token"),
    ).toEqual({ kind: "authenticated", subject: "reader-a" });
    expect(verifier.verify).toHaveBeenCalledWith("test-token");
  });
  it("rejects verifier failures without disclosing provider details", async () => {
    const verifier = {
      verify: vi
        .fn<TokenVerifier["verify"]>()
        .mockRejectedValue(new Error("private provider detail")),
    };
    expect(await createAuthService({ verifier, publisherToken: "" }).reader("Bearer bad")).toEqual({
      kind: "invalid",
    });
  });
  it("requires an exact configured publisher credential", () => {
    const verifier = { verify: vi.fn<TokenVerifier["verify"]>() };
    const service = createAuthService({ verifier, publisherToken: "test-only" });
    expect(service.publisher("Bearer test-only")).toBe(true);
    expect(service.publisher("Bearer test-onlz")).toBe(false);
    expect(service.publisher(undefined)).toBe(false);
    expect(createAuthService({ verifier, publisherToken: "" }).publisher("Bearer ")).toBe(false);
  });
  it("redacts token fields in shared browser diagnostics", () => {
    const message = authErrorMessage(new Error("access_token=private-value Bearer confidential"));
    expect(message).not.toContain("private-value");
    expect(message).not.toContain("confidential");
    expect(message).toContain("[redacted]");
  });
});
