import * as jwt from 'jsonwebtoken';
import { Pems } from 'types';
import { debugLog } from './DebugMessageLog';


/**
 * JWT Injection
 */
export async function verify(token: string, iss: string, pems: Pems) {
    // Decod
    const decodedJwt = jwt.decode(token, { complete: true });
    if (!decodedJwt) {
        return [false, ''];
    }

    // Checktto decoded value
    debugLog('[JWT Decoded]', decodedJwt, 0);


    // Check to match issuer
    if (decodedJwt.payload["iss"] !== iss) {
        debugLog('[iss Check]', false, 1);
        return [false, ''];
    }

    // Check to access token
    if (decodedJwt.payload["token_use"] !== 'access') {
        debugLog('[token_use Check]', false, 1);
        return [false, ''];
    }

    // Check to match audience
    if (decodedJwt.payload["scope"] !== 'aws.cognito.signin.user.admin'){
        debugLog('[audience Check]', false, 1);
        return [false, ''];
    }

    // Check to pulubic key ID
    let kid = decodedJwt.header.kid;
    let pem = pems[kid];

    if (!pem) {
        debugLog('[pem Check]', false, 1);
        return [false, ''];
    }


    return new Promise((resolve, reject) => {
        jwt.verify(token, pem, { issuer: iss }, (error) => {
            if (error) {
                console.log('iss:' + iss);
                debugLog('[verify Check]', false, 1);
                reject([error, '']);
            } else {
                // Get to userId
                if (decodedJwt.payload["sub"] == null) {
                    debugLog('[userId Check]', false, 1);
                    return [false, ''];
                }
                let user_id = decodedJwt.payload["sub"];

                resolve([true, user_id]);
            }
        });
        
    });

}
