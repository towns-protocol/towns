/// This file can be used on server side to create a Towns Protocol Client
/// We don't want a 'use client' directive here
import {
    type SignerContext,
    SyncAgent,
    type SyncAgentConfig,
    makeSignerContext,
    makeSignerContextFromBearerToken,
} from '@towns-protocol/sdk'
import { ethers } from 'ethers'

const defaultConfig: Partial<SyncAgentConfig> = {
    unpackEnvelopeOpts: {
        disableSignatureValidation: true,
    },
}

/**
 * Sign and connect to Towns using a Signer and a random delegate wallet every time
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
    return new SyncAgent({
        context: signerContext,
        ...defaultConfig,
        ...config,
    })
}

/**
 * Connect to Towns using a SignerContext
 *
 * Useful for server side code, allowing you to persist the signer context and use it to auth with Towns later
 * @param signerContext - The signer context to use
 * @param config - The configuration for the sync agent
 * @returns The sync agent
 */
export const connectTowns = async (
    signerContext: SignerContext,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    return new SyncAgent({
        context: signerContext,
        ...defaultConfig,
        ...config,
    })
}

/**
 * Connect to Towns using a Bearer Token
 * Towns clients can use this to connect to Towns Protocol on behalf of a user
 *
 * Useful for server side code, allowing you to persist the signer context and use it to auth with Towns later
 * @param token - The bearer token to use
 * @param config - The configuration for the sync agent
 * @returns The sync agent
 */
export const connectTownsWithBearerToken = async (
    token: string,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    const signerContext = await makeSignerContextFromBearerToken(token)
    return new SyncAgent({
        context: signerContext,
        ...defaultConfig,
        ...config,
    })
}
