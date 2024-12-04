/// This file can be used on server side to create a River Client
/// We don't want a 'use client' directive here
import {
    type SignerContext,
    SyncAgent,
    type SyncAgentConfig,
    makeSignerContext,
    makeSignerContextFromBearerToken,
} from '@river-build/sdk'
import { ethers } from 'ethers'

const defaultConfig: Partial<SyncAgentConfig> = {
    unpackEnvelopeOpts: {
        disableSignatureValidation: true,
    },
}

/**
 * Sign and connect to River using a Signer and a random delegate wallet every time
 * @param signer - The signer to use
 * @param config - The configuration for the sync agent
 * @returns The sync agent
 */
export const signAndConnect = async (
    signer: ethers.Signer,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(signer, delegateWallet)
    return new SyncAgent({ context: signerContext, ...defaultConfig, ...config })
}

/**
 * Connect to River using a SignerContext
 *
 * Useful for server side code: you can persist the signer context and use it to auth with River later
 * @param signerContext - The signer context to use
 * @param config - The configuration for the sync agent
 * @returns The sync agent
 */
export const connectRiver = async (
    signerContext: SignerContext,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    return new SyncAgent({ context: signerContext, ...defaultConfig, ...config })
}

/**
 * Connect to River using a Bearer Token
 * River clients can use this to connect to River on behalf of a user
 *
 * Useful for server side code: you can persist the bearer token and use it to auth with River later
 * @param token - The bearer token to use
 * @param config - The configuration for the sync agent
 * @returns The sync agent
 */
export const connectRiverWithBearerToken = async (
    token: string,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    const signerContext = await makeSignerContextFromBearerToken(token)
    return new SyncAgent({ context: signerContext, ...defaultConfig, ...config })
}
