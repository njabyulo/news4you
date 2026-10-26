import type { ConnectionService } from "../auth/connection/service";
import type { EditionService } from "./edition/service";
import type { GenerationService } from "./generation/service";
import type { ReaderService } from "./reader/service";

export interface NewspaperServiceDependencies {
  reader: Pick<ReaderService, keyof ReaderService>;
  edition: Pick<EditionService, keyof EditionService>;
  generation: Pick<GenerationService, keyof GenerationService>;
  connection: Pick<ConnectionService, keyof ConnectionService>;
}

export type NewspaperServices = Pick<NewspaperService, keyof NewspaperService>;

export const createNewspaperService = (dependencies: NewspaperServiceDependencies) =>
  new NewspaperService(dependencies);

export class NewspaperService {
  readonly reader;
  readonly edition;
  readonly generation;
  readonly connection;
  constructor(dependencies: NewspaperServiceDependencies) {
    this.reader = dependencies.reader;
    this.edition = dependencies.edition;
    this.generation = dependencies.generation;
    this.connection = dependencies.connection;
  }
}
