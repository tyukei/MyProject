//debug
export function debugLog(message, result, type) {
    switch (type) {
        case 0:
            // Log to Nomal
            // console.log(message, result);
            break;
        case 1:
            // Log to Exception
            console.error(message, result);
            break;
    }
}
