import * as jwkToPem from 'jwk-to-pem';
import { Pems } from 'types';

/**
 * JWKS ‚ğ PEM Œ`®‚Ö•ÏŠ·‚·‚éB
 */
export function convertJwksToPem(jwks): Pems {
    const pems: Pems = {};
    const keys = jwks.keys;

    for (let i = 0; i < keys.length; i++) {
        const keyId = keys[i]!.kid;
        const modules = keys[i]!.n;
        const exponent = keys[i]!.e;
        const keyType = keys[i]!.kty;
        const jwk = { kty: keyType, n: modules, e: exponent };

        pems[keyId] = jwkToPem(jwk);
    }
    return pems;
}