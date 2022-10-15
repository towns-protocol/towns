import { ecsign, toRpcSig } from '@ethereumjs/util'
import { makeZionRpcClient } from '@zion/client'
import { BaseEvent, FullEvent, hashEvent, Payload, ZionServiceInterface } from '@zion/core'
import { Wallet } from 'ethers'
import { nanoid } from 'nanoid'
import { ZionApp } from '../app'
import { config } from '../config'

export const makeEvent_test = (
    wallet: Wallet,
    payload: Payload,
    prevEvents: string[],
): FullEvent => {
    const event: BaseEvent = {
        creatorAddress: wallet.address,
        salt: nanoid(),
        prevEvents: prevEvents,
        payload: payload,
    }

    const [hash, hashBuffer] = hashEvent(event)
    const { v, r, s } = ecsign(hashBuffer, Buffer.from(wallet.privateKey.slice(2), 'hex'))
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
