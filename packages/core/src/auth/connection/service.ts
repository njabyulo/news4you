import type { ConnectionRepositoryPort } from "./repository";
import { googleSettingsSchema, type GoogleSettings } from "@news4you/shared";

export const createConnectionService = (repository: ConnectionRepositoryPort) =>
  new ConnectionService(repository);

export class ConnectionService {
  constructor(private repository: ConnectionRepositoryPort) {}
  get(reader: string) {
    return this.repository.getGoogleConnection(reader);
  }
  saveAuthorization(
    state: string,
    reader: string,
    encryptedVerifier: string,
    nonce: string,
    expiresAt: string,
  ) {
    return this.repository.saveGoogleOAuthState(state, reader, encryptedVerifier, nonce, expiresAt);
  }
  consumeAuthorization(state: string) {
    return this.repository.consumeGoogleOAuthState(state);
  }
  saveSettings(reader: string, settings: GoogleSettings) {
    return this.repository.saveGoogleSettings(reader, googleSettingsSchema.parse(settings));
  }
  disconnect(reader: string) {
    return this.repository.deleteGoogleConnection(reader);
  }
  save(reader: string, encryptedRefreshToken: string) {
    return this.repository.saveGoogleConnection(reader, encryptedRefreshToken);
  }
  recordSync(reader: string, timestamp: string) {
    return this.repository.recordGoogleSync(reader, timestamp);
  }
}
