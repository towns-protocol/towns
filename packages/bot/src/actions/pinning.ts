import { make_MemberPayload_Pin, make_MemberPayload_Unpin } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/utils'
import type { StreamEvent } from '@towns-protocol/proto'
import type { BotClient, ParamsWithoutClient } from './types'

export type PinMessageParams = ParamsWithoutClient<typeof pinMessage>
export type UnpinMessageParams = ParamsWithoutClient<typeof unpinMessage>

export const pinMessage = async (
    client: BotClient,
    streamId: string,
    eventId: string,
    streamEvent: StreamEvent,
) => client.sendEvent(streamId, make_MemberPayload_Pin(bin_fromHexString(eventId), streamEvent))

export const unpinMessage = async (client: BotClient, streamId: string, eventId: string) =>
    client.sendEvent(streamId, make_MemberPayload_Unpin(bin_fromHexString(eventId)))
