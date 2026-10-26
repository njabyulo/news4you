import type { TokenVerifier } from "@news4you/shared";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export interface Auth0VerifierOptions {
  domain: string;
  audience: string;
  keyOverride?: JWTVerifyGetKey;
}

const keys = new Map<string, JWTVerifyGetKey>();

export const createAuth0Verifier = ({
  domain,
  audience,
  keyOverride,
}: Auth0VerifierOptions): TokenVerifier => ({
  async verify(token) {
    const issuer = `https://${domain}/`;
    if (!keys.has(issuer))
      keys.set(issuer, createRemoteJWKSet(new URL(".well-known/jwks.json", issuer)));
    const { payload } = await jwtVerify(token, keyOverride ?? keys.get(issuer)!, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat"],
    });
    if (!payload.sub) throw new Error("Invalid access token");
    return payload.sub;
  },
});
