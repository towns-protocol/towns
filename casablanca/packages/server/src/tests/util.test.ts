import { ecsign, stripHexPrefix, toRpcSig } from '@ethereumjs/util'
import { makeZionRpcClient } from '@zion/client'
import {
    BaseEvent,
    FullEvent,
    hashEvent,
    makeDelegateSig,
    Payload,
    SignerContext,
    ZionServiceInterface,
} from '@zion/core'
import { Wallet } from 'ethers'
import { nanoid } from 'nanoid'
import { ZionApp } from '../app'
import { config } from '../config'

export const makeEvent_test = (
    context: SignerContext,
    payload: Payload,
    prevEvents: string[],
): FullEvent => {
    const event: BaseEvent = {
        creatorAddress: context.creatorAddress,
        salt: nanoid(),
        prevEvents: prevEvents,
        payload: payload,
    }
    if (context.delegateSig !== undefined) {
        event.delegageSig = context.delegateSig
    }

    const [hash, hashBuffer] = hashEvent(event)
    const { v, r, s } = ecsign(
        hashBuffer,
        Buffer.from(stripHexPrefix(context.wallet.privateKey), 'hex'),
    )
    const signature = toRpcSig(v, r, s)

    return { hash, signature, base: event }
}

export type TestParams = [string, () => ZionServiceInterface][]

export const makeTestParams = (zionApp: () => ZionApp): TestParams => {
    const ret: TestParams = [
        ['direct', () => zionApp().zionServer],
        ['viaClient', () => makeZionRpcClient(zionApp().url)],
    ]
    if (config.testRemoteUrl !== undefined) {
        ret.push(['remote', () => makeZionRpcClient(config.testRemoteUrl)])
    }
    return ret
}

export const makeRandomUserContext = async (): Promise<SignerContext> => {
    const primaryWallet = Wallet.createRandom()
    const wallet = Wallet.createRandom()
    return {
        wallet,
        creatorAddress: primaryWallet.address,
        delegateSig: await makeDelegateSig(primaryWallet, wallet),
    }
}
