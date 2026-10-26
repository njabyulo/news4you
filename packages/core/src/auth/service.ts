import type { TokenVerifier, ReaderAuthentication } from "@news4you/shared";

export interface AuthServiceDependencies {
  verifier: TokenVerifier;
  publisherToken: string;
}

export type AuthServicePort = Pick<AuthService, keyof AuthService>;

export const createAuthService = (dependencies: AuthServiceDependencies) =>
  new AuthService(dependencies);

export class AuthService {
  constructor(private dependencies: AuthServiceDependencies) {}
  async reader(header: string | undefined): Promise<ReaderAuthentication> {
    const token = header?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return { kind: "missing" };
    try {
      const subject = await this.dependencies.verifier.verify(token);
      return subject ? { kind: "authenticated", subject } : { kind: "invalid" };
    } catch {
      return { kind: "invalid" };
    }
  }
  publisher(header: string | undefined): boolean {
    const supplied = header ?? "",
      expected = "Bearer " + this.dependencies.publisherToken;
    if (!this.dependencies.publisherToken || supplied.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < supplied.length; index++)
      difference |= supplied.charCodeAt(index) ^ expected.charCodeAt(index);
    return difference === 0;
  }
}
