import { now, run, item, content } from "../../fixtures/publication";
import { createPublicationService, createSourceService } from "@news4you/core";
import type { EditionEditor, PublicationQueue, PublicSourceCollector } from "@news4you/shared";
import { defaults, type SourceItem } from "@news4you/shared";
import { describe, expect, it, vi } from "vitest";

function harness() {
  const queue = {
    schedule: vi.fn<PublicationQueue["schedule"]>().mockResolvedValue(),
    claim: vi.fn<PublicationQueue["claim"]>().mockResolvedValueOnce(run).mockResolvedValue(null),
    progress: vi.fn<PublicationQueue["progress"]>().mockResolvedValue(),
    personal: vi.fn<PublicationQueue["personal"]>().mockResolvedValue({ items: [] }),
    publish: vi.fn<PublicationQueue["publish"]>().mockResolvedValue(),
    fail: vi.fn<PublicationQueue["fail"]>().mockResolvedValue(),
  } satisfies PublicationQueue;
  return {
    queue,
    sourceService: createSourceService(),
    editor: { edit: vi.fn<EditionEditor["edit"]>().mockResolvedValue(content) },
    sources: {
      collect: vi.fn<PublicSourceCollector["collect"]>().mockResolvedValue([item]),
    },
    now: () => now,
    logger: { info: vi.fn(), error: vi.fn() },
  };
}

describe("publication application service", () => {
  it("schedules, selects sources and publishes with the claimed date and fencing token", async () => {
    const dependencies = harness();
    const meeting: SourceItem = {
      ...item,
      id: "meeting",
      kind: "calendar",
      title: "Example meeting",
      content: "10:00",
      fingerprint: "meeting",
    };
    dependencies.queue.personal.mockResolvedValue({ items: [meeting] });
    const result = await createPublicationService(dependencies).run();
    expect(result).toEqual({ calls: 1, failed: false });
    expect(dependencies.queue.schedule.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.queue.claim.mock.invocationCallOrder[0],
    );
    expect(dependencies.editor.edit).toHaveBeenCalledWith(
      [item],
      defaults,
      run.localDate,
      expect.any(Function),
    );
    expect(dependencies.queue.publish).toHaveBeenCalledWith(run, {
      leaseToken: run.leaseToken,
      content,
      items: [item],
      emails: [],
      agenda: [{ title: meeting.title, detail: meeting.content, url: meeting.url }],
    });
    expect(dependencies.queue.fail).not.toHaveBeenCalled();
  });
  it("keeps private email out of the editor, references and source history", async () => {
    const dependencies = harness();
    const email: SourceItem = {
      ...item,
      id: "private-email",
      kind: "email",
      title: "Private subject",
      content: "Private sender metadata",
    };
    dependencies.queue.personal.mockResolvedValue({ items: [email] });
    // Defend against a source adapter accidentally mixing public and private kinds.
    dependencies.sources.collect.mockResolvedValue([item, email]);
    await createPublicationService(dependencies).run({
      runId: run.id,
      scheduled: false,
      maxRuns: 1,
    });
    expect(dependencies.queue.schedule).not.toHaveBeenCalled();
    expect(dependencies.queue.claim).toHaveBeenCalledWith(run.id);
    expect(dependencies.editor.edit.mock.calls[0][0]).toEqual([item]);
    expect(dependencies.queue.publish.mock.calls[0][1]).toMatchObject({
      items: [item],
      emails: [{ title: email.title, detail: email.content, url: email.url }],
    });
    expect(JSON.stringify(dependencies.queue.progress.mock.calls)).not.toContain("Private subject");
  });
  it("records an editor failure and stops before claiming another run", async () => {
    const dependencies = harness();
    dependencies.editor.edit.mockRejectedValue(new Error("Model unavailable"));
    expect(await createPublicationService(dependencies).run()).toEqual({
      calls: 1,
      failed: true,
    });
    expect(dependencies.queue.fail).toHaveBeenCalledWith(run, "Model unavailable");
    expect(dependencies.queue.publish).not.toHaveBeenCalled();
    expect(dependencies.queue.claim).toHaveBeenCalledTimes(1);
  });
  it("does not call the editor when personal collection fails", async () => {
    const dependencies = harness();
    dependencies.queue.personal.mockRejectedValue(new Error("Consent revoked"));
    expect(await createPublicationService(dependencies).run()).toEqual({
      calls: 0,
      failed: true,
    });
    expect(dependencies.editor.edit).not.toHaveBeenCalled();
    expect(dependencies.queue.fail).toHaveBeenCalledWith(run, "Consent revoked");
  });
  it("does not spend an editor call on already covered sources", async () => {
    const dependencies = harness();
    dependencies.queue.claim.mockReset().mockResolvedValue({ ...run, covered: [item.fingerprint] });
    expect(await createPublicationService(dependencies).run()).toEqual({
      calls: 0,
      failed: true,
    });
    expect(dependencies.editor.edit).not.toHaveBeenCalled();
    expect(dependencies.queue.fail).toHaveBeenCalledWith(
      expect.anything(),
      "No fresh source items",
    );
  });
  it("limits one invocation to five editor calls even when work remains", async () => {
    const dependencies = harness();
    dependencies.queue.claim.mockReset().mockResolvedValue(run);
    expect(await createPublicationService(dependencies).run()).toEqual({
      calls: 5,
      failed: false,
    });
    expect(dependencies.queue.claim).toHaveBeenCalledTimes(5);
    expect(dependencies.queue.publish).toHaveBeenCalledTimes(5);
  });
  it("stops before claiming when the invocation deadline has elapsed", async () => {
    const dependencies = harness();
    dependencies.now = vi
      .fn()
      .mockReturnValueOnce(now)
      .mockReturnValue(new Date(now.getTime() + 12 * 60000));
    expect(await createPublicationService(dependencies).run()).toEqual({
      calls: 0,
      failed: false,
    });
    expect(dependencies.queue.claim).not.toHaveBeenCalled();
  });
});
