import { make_ChannelPayload_Redaction } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/utils'
import { MessageInteractionType } from '@towns-protocol/proto'
import type { BotClient, ParamsWithoutClient } from './types'

export type BanParams = ParamsWithoutClient<typeof ban>
export type UnbanParams = ParamsWithoutClient<typeof unban>
export type AdminRemoveEventParams = ParamsWithoutClient<typeof adminRemoveEvent>

export const ban = async (client: BotClient, userId: string, spaceId: string) => {
    const tx = await client.spaceDapp.banWalletAddress(spaceId, userId, client.wallet)
    const receipt = await tx.wait()
    return { txHash: receipt.transactionHash }
}

export const unban = async (client: BotClient, userId: string, spaceId: string) => {
    const tx = await client.spaceDapp.unbanWalletAddress(spaceId, userId, client.wallet)
    const receipt = await tx.wait()
    return { txHash: receipt.transactionHash }
}

export const adminRemoveEvent = async (client: BotClient, streamId: string, messageId: string) =>
    client.sendEvent(streamId, make_ChannelPayload_Redaction(bin_fromHexString(messageId)), {
        participatingUserAddresses: [],
        threadId: undefined,
        messageInteractionType: MessageInteractionType.REDACTION,
        groupMentionTypes: [],
        mentionedUserAddresses: [],
    })
