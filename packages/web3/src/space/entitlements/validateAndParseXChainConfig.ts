import { dlogger } from '@towns-protocol/utils'

interface ParsedObject {
    [key: number]: string
}

const log = dlogger('csb:validateAndParseXChainConfig')

// input should be of the type 31337:http://alchemyurl.com/v2/<API_KEY>,1:http://alchemyurl.com/v2/<API_KEY>
// and returns a record of chainId to alchemy url
export const validateAndParseXChainConfig = (input: string): ParsedObject => {
    const obj: ParsedObject = {}
    const urlPattern: RegExp = /^(http|https):\/\/[^\s/$.?#].[^\s]*$/
    const pairs: string[] = input.split(',')

    for (const pair of pairs) {
        const colonIndex = pair.indexOf(':')
        if (colonIndex === -1) {
            log.warn(
                `Invalid XChain config pair: "${pair}". Each pair must be in the format key:url.`,
            )
            continue
        }
        const key = pair.substring(0, colonIndex)
        const value = pair.substring(colonIndex + 1)

        if (!key || !value) {
            log.warn(
                `Invalid XChain config pair: "${pair}". Each pair must be in the format key:url.`,
            )
            continue
        }

        const keyNumber = Number(key)

        if (isNaN(keyNumber)) {
            log.warn(`Invalid XChain config key: "${key}". Key must be a number.`)
            continue
        }

        if (!urlPattern.test(value)) {
            log.warn(`Invalid XChain config URL: "${value}". Value must be a valid URL.`)
            continue
        }

        obj[keyNumber] = value
    }

    return obj
}
