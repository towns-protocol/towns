/**
 * @group main
 */

import { dlog } from '../dlog'
import { townsHash, townsRecoverPubKey, townsSign, townsVerifySignature } from './crypto'
import { bin_fromHexString, bin_toHexString } from '../binary'
import { getPublicKey, utils } from 'ethereum-cryptography/secp256k1'
import { readFileSync, writeFileSync } from 'fs'

const log = dlog('test:crypto')

// To generate test data run as:
//
//   GENERATE_DATA=1 yarn test src/crypto.test.ts -t checkData
//

describe('crypto', () => {
    const KEYS_FILE = '../test/crypto/keys.csv'
    const DATA_FILE = '../test/crypto/test_data.csv'

    const generateData = async () => {
        const keys = Array.from({ length: 5 }, () => {
            const pr = utils.randomPrivateKey()
            const pu = getPublicKey(pr)
            return [pr, pu]
        })
        // Write CSV of keys to KEYS_FILE
        const csv = keys
            .map(([pr, pu]) => `${bin_toHexString(pr)},${bin_toHexString(pu)}`)
            .join('\n')
        writeFileSync(KEYS_FILE, csv, 'utf8')

        const genDataLine = async (d: Uint8Array) => {
            const hash = townsHash(d)
            const ret = [d, hash]
            for (const [pr] of keys) {
                ret.push(await townsSign(hash, pr))
            }
            return ret
        }

        const data = []
        for (let i = 0; i <= 255; ++i) {
            data.push(await genDataLine(new Uint8Array([i])))
        }
        for (let len = 2; len <= 300; ++len) {
            for (let i = 0; i < 10; ++i) {
                data.push(await genDataLine(utils.randomBytes(len)))
            }
        }

        // Write CSV of data to DATA_FILE
        const csvData = data.map((d) => d.map((x) => bin_toHexString(x)).join(',')).join('\n')
        writeFileSync(DATA_FILE, csvData, 'utf8')
    }

    if (process.env.GENERATE_DATA === '1') {
        test('generateData', async () => {
            await generateData()
        })
    } else {
        const keys = readFileSync(KEYS_FILE, 'utf8')
            .split('\n')
            .filter((x) => x)
            .map((x) => x.split(',').map(bin_fromHexString))

        test('keys', () => {
            log('Loaded %d keys', keys.length)
            keys.forEach(([pr, pu]) => {
                expect(getPublicKey(pr)).toEqual(pu)
            })
            log('Keys OK')
        })

        const data = readFileSync(DATA_FILE, 'utf8')
            .split('\n')
            .filter((x) => x)

        log('Loaded %d data lines', data.length)

        const SHARDS = 16
        // Limit to just 2 shards for time sake.
        // Should be run with 16 shards to get full coverage.
        const SHARDS_LIMIT = +(process.env.SHARDS_LIMIT ?? '2')
        log('Limiting to %d shards for time sake.', SHARDS_LIMIT)
        for (let shard = 0; shard < SHARDS_LIMIT; ++shard) {
            const s = shard.toString().padStart(2, '0')
            test(`checkData_Shard_${s}_of_${SHARDS}`, async () => {
                const log_shard = log.extend(`shard` + s)
                log_shard('Started')

                let badHash = bin_fromHexString(
                    '8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b0',
                )
                let badSig = bin_fromHexString(
                    '8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b08dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b000',
                )

                for (let i = shard; i < data.length; i += SHARDS) {
                    const line = data[i]
                    log_shard('Checking line %d', i)
                    const [d, h, ...sigs] = line.split(',').map(bin_fromHexString)
                    const hash = townsHash(d)
                    expect(h).toEqual(hash)
                    for (let i = 0; i < keys.length; ++i) {
                        const [pr, pu] = keys[i]
                        const sig = sigs[i]
                        expect(await townsSign(hash, pr)).toEqual(sig)
                        expect(await townsSign(badHash, pr)).not.toEqual(sig)
                        expect(townsRecoverPubKey(hash, sig)).toEqual(pu)
                        expect(townsRecoverPubKey(badHash, sig)).not.toEqual(pu)
                        expect(townsRecoverPubKey(hash, badSig)).not.toEqual(pu)
                        expect(townsVerifySignature(hash, sig, pu)).toEqual(true)
                        expect(townsVerifySignature(badHash, sig, pu)).toEqual(false)
                        expect(townsVerifySignature(hash, badSig, pu)).toEqual(false)
                        badSig = sig
                    }
                    badHash = hash
                    log_shard('Line %d OK', i)
                }
                log_shard('All lines OK')
            })
        }
    }
})
