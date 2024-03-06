import {
    Account as OlmAccount,
    PkEncryption as OlmPkEncryption,
    PkDecryption as OlmPkDecryption,
    PkSigning as OlmPkSigning,
    Session as OlmSession,
    Utility as OlmUtility,
    OutboundGroupSession as OlmOutboundGroupSession,
    InboundGroupSession as OlmInboundGroupSession,
} from '@matrix-org/olm'

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
