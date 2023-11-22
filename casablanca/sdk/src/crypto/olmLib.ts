/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-misused-promises, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument*/

// OLM_OPTIONS is undefined https://gitlab.matrix.org/matrix-org/olm/-/issues/10
// but this comment suggests we define it ourselves? https://gitlab.matrix.org/matrix-org/olm/-/blob/master/javascript/olm_pre.js#L22-24
globalThis.OLM_OPTIONS = {}

/**
 * Utilities common to Olm encryption
 */
import { dlog } from '../dlog'
import { EncryptedData } from '@river/proto'
import { PlainMessage } from '@bufbuild/protobuf'

const log = dlog('csb:olmLib')

// Supported algorithms
enum Algorithm {
    Olm = 'm.olm.v1.curve25519-aes-sha2',
    Megolm = 'm.megolm.v1.aes-sha2',
}

/**
 * river algorithm tag for olm
 */
export const OLM_ALGORITHM = Algorithm.Olm

/**
 * river algorithm tag for megolm
 */
export const MEGOLM_ALGORITHM = Algorithm.Megolm

export interface IMegolmEncryptedContent {
    algorithm: typeof MEGOLM_ALGORITHM
    sender_key: string
    session_id: string
    device_id: string
    ciphertext: PlainMessage<EncryptedData>['text']
}

export interface ISignatures {
    [entity: string]: {
        [keyId: string]: string
    }
}

export interface UserDevice {
    deviceId: string
    deviceKey: string
    fallbackKey: string
}

export interface UserDeviceCollection {
    [userId: string]: UserDevice[]
}
