import type { SourceItem } from "@news4you/shared";

export type SourceServicePort = Pick<SourceService, keyof SourceService>;

export const createSourceService = (logger: { warn(message: string): void } = console) =>
  new SourceService(logger);

// A personal-source failure must be visible: publishing a generic paper would
// make a missing meeting or delivery look like an empty day.
export class SourceService {
  constructor(private logger: { warn(message: string): void }) {}
  async collect(
    personalRequest: Promise<{ items: SourceItem[] }>,
    publicRequest: Promise<SourceItem[]>,
  ): Promise<{ personal: SourceItem[]; collected: SourceItem[] }> {
    const [personal, publicSources] = await Promise.allSettled([personalRequest, publicRequest]);
    if (personal.status === "rejected") throw personal.reason;
    if (publicSources.status === "rejected" && !personal.value.items.length)
      throw publicSources.reason;
    if (publicSources.status === "rejected")
      this.logger.warn("Public sources unavailable; publishing available personal sources.");
    return {
      personal: personal.value.items,
      collected: [
        ...personal.value.items,
        ...(publicSources.status === "fulfilled" ? publicSources.value : []),
      ],
    };
  }
}
