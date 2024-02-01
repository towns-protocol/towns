// OLM_OPTIONS is undefined https://gitlab.matrix.org/matrix-org/olm/-/issues/10
// but this comment suggests we define it ourselves? https://gitlab.matrix.org/matrix-org/olm/-/blob/master/javascript/olm_pre.js#L22-24
globalThis.OLM_OPTIONS = {}

/**
 * Utilities common to Olm encryption
 */

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

export interface UserDevice {
    deviceKey: string
    fallbackKey: string
}

export interface UserDeviceCollection {
    [userId: string]: UserDevice[]
}

export interface GroupEncryptionSession {
    streamId: string
    sessionId: string
    sessionKey: string
    algorithm: string
}
