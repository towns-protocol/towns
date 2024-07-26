/// This file can be used on server side to create a River Client
/// We don't want a 'use client' directive here
import {
    type SignerContext,
    SyncAgent,
    type SyncAgentConfig,
    makeSignerContext,
} from '@river-build/sdk'
import { ethers } from 'ethers'

export const signAndConnect = async (
    signer: ethers.Signer,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(signer, delegateWallet)
    return new SyncAgent({ context: signerContext, ...config })
}

export const connectRiver = async (
    signerContext: SignerContext,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    return new SyncAgent({ context: signerContext, ...config })
}
