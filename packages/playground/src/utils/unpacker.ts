import { type Unpacker } from '@towns-protocol/sdk'
import { type Pool } from 'workerpool'

export const createUnpackerWorkerpool = (pool: Pool) => {
    return {
        unpackEnvelope: (...args: Parameters<Unpacker['unpackEnvelope']>) =>
            pool.exec('unpackEnvelope', args),
        unpackEnvelopes: (...args: Parameters<Unpacker['unpackEnvelopes']>) =>
            pool.exec('unpackEnvelopes', args),
        unpackStreamEnvelopes: (...args: Parameters<Unpacker['unpackStreamEnvelopes']>) =>
            pool.exec('unpackStreamEnvelopes', args),
        unpackStream: (...args: Parameters<Unpacker['unpackStream']>) =>
            pool.exec('unpackStream', args),
        unpackStreamEx: (...args: Parameters<Unpacker['unpackStreamEx']>) =>
            pool.exec('unpackStreamEx', args),
        unpackStreamAndCookie: (...args: Parameters<Unpacker['unpackStreamAndCookie']>) =>
            pool.exec('unpackStreamAndCookie', args),
        unpackSnapshot: (...args: Parameters<Unpacker['unpackSnapshot']>) =>
            pool.exec('unpackSnapshot', args),
        unpackMiniblock: (...args: Parameters<Unpacker['unpackMiniblock']>) =>
            pool.exec('unpackMiniblock', args),
    } satisfies Unpacker
}
