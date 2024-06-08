import { RSA_JWK } from 'pem-jwk';

type Jwk =
  | RSA_JWK
  | {
      alg: string;
      kid: string;
      use: string;
    };

interface Jwks {
  keys: Jwk[];
}

interface Pems {
  [key: string]: string;
}