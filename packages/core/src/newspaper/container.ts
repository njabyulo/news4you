import { createConnectionRepository } from "../auth/connection/repository";
import { createConnectionService } from "../auth/connection/service";
import { createEditionRepository } from "./edition/repository";
import { createEditionService } from "./edition/service";
import { createGenerationRepository } from "./generation/repository";
import { createGenerationService } from "./generation/service";
import { createReaderRepository } from "./reader/repository";
import { createReaderService } from "./reader/service";
import { createNewspaperService } from "./service";
import { createSourceRepository } from "./source/repository";
import type { DatabaseClient } from "@news4you/database/client";

export const composeConnectionService = (db: DatabaseClient) =>
  createConnectionService(createConnectionRepository(db));

export const composeNewspaperServices = (db: DatabaseClient) => {
  const readers = createReaderRepository(db),
    editions = createEditionRepository(db),
    generations = createGenerationRepository(db),
    sources = createSourceRepository(db);
  const now = () => new Date();
  return createNewspaperService({
    reader: createReaderService(readers),
    edition: createEditionService({ repository: editions, generations, readers, now }),
    generation: createGenerationService({ repository: generations, readers, sources, now }),
    connection: composeConnectionService(db),
  });
};

export type { NewspaperServices } from "./service";
