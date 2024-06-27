/// This file can be used on server side to create a River Client
/// We don't want a 'use client' directive here
import { SyncAgent, type SyncAgentConfig, makeSignerContext } from '@river-build/sdk'
import { ethers } from 'ethers'

export const connectRiver = async (
    signer: ethers.Signer,
    config: Omit<SyncAgentConfig, 'context'>,
): Promise<SyncAgent> => {
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(signer, delegateWallet)
    return new SyncAgent({ context: signerContext, ...config })
}
