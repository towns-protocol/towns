import {
    Account as OlmAccount,
    InboundGroupSession as OlmInboundGroupSession,
    OutboundGroupSession as OlmOutboundGroupSession,
    PkDecryption as OlmPkDecryption,
    PkEncryption as OlmPkEncryption,
    PkSigning as OlmPkSigning,
    Session as OlmSession,
    Utility as OlmUtility,
} from '@matrix-org/olm'

import { EncryptedData } from '@river-build/proto'

export type Account = OlmAccount
export type PkDecryption = OlmPkDecryption
export type PkEncryption = OlmPkEncryption
export type PkSigning = OlmPkSigning
export type Session = OlmSession
export type Utility = OlmUtility
export type OutboundGroupSession = OlmOutboundGroupSession
export type InboundGroupSession = OlmInboundGroupSession

export interface IOutboundGroupSessionKey {
    chain_index: number
    key: string
}

export interface DecryptedContentError {
    missingSession: boolean
    encryptedData: EncryptedData
    error?: unknown
}
