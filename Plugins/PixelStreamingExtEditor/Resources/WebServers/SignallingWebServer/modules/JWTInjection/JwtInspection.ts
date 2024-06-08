import { convertJwksToPem } from './ConvertJwksToPem';
import { verify } from './Verify';
import { debugLog } from './DebugMessageLog';


const region = 'ap-northeast-1';
const pool_id = "ap-northeast-1_Dh5oW6SyY";
const user_pool_id = process.env.USER_POOL_ID || pool_id;


// Start to Check
export async function JWTCheck(token) {
    // region‚ÍŒÅ’è‚Å—Ç‚¢
    let iss = 'https://cognito-idp.' + region + '.amazonaws.com/' + user_pool_id;
    let iss_path = iss + '/.well-known/jwks.json';
    let request = require('request');

    return new Promise((resolve, reject) => {
        request(iss_path, (error, response, body) => {
            if (error !== null) {
                debugLog('[Public Key Read]', error, 1);
                resolve([false, '']);
                return;
            }

            try {
                // json object
                let jwks = JSON.parse(body)
                debugLog('[Public Key Decoded]', jwks, 0);

                // json to pems
                let pems = convertJwksToPem(jwks);
                debugLog('[Pems Decoded]', pems, 0);

                // JWT Check
                verify(token, iss, pems).then((result) => {
                    resolve(result);
                })
                .catch((error) => {
                    debugLog('[Verify Check]', 'JsonWebTokenError: invalid algorithm', 1);
                    resolve([false, '']);
                });

            } catch (e) {
                if (e instanceof SyntaxError) {
                    debugLog('[Public Key Decoded]', 'Json SyntaxError', 1);
                }
                else if (e instanceof TypeError) {
                    debugLog('[Pems Decoded]', 'Convert jwks to pem Error', 1);
                }
                else {
                    debugLog('[Exception]', e, 1);
                }
                resolve([false, '']);
            }
        });
    });
}

