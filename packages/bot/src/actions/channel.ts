import {
    spaceIdFromChannelId,
    makeUniqueChannelStreamId,
    make_ChannelPayload_Inception,
    make_MemberPayload_Membership2,
    streamIdAsBytes,
    makeEvent,
} from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/utils'
import { SpaceAddressFromSpaceId, Permission } from '@towns-protocol/web3'
import { readContract, waitForTransactionReceipt, writeContract } from 'viem/actions'
import { MembershipOp } from '@towns-protocol/proto'
import channelsFacetAbi from '@towns-protocol/generated/dev/abis/Channels.abi'
import rolesFacetAbi from '@towns-protocol/generated/dev/abis/Roles.abi'
import type { BotClient, ParamsWithoutClient } from './types'

export type GetChannelSettingsParams = ParamsWithoutClient<typeof getChannelSettings>
export type GetRolesParams = ParamsWithoutClient<typeof getRoles>
export type CreateChannelActionParams = ParamsWithoutClient<typeof createChannel>

export type CreateChannelParams = {
    name: string
    description?: string
    autojoin?: boolean
    hideUserJoinLeaveEvents?: boolean
}

export const getChannelSettings = async (client: BotClient, channelId: string) => {
    const spaceId = spaceIdFromChannelId(channelId)
    const streamView = await client.getStream(spaceId)
    const channel = streamView.spaceContent.spaceChannelsMetadata[channelId]
    return channel
}

export const getRoles = async (client: BotClient, spaceId: string) => {
    const roles = await readContract(client.viem, {
        address: SpaceAddressFromSpaceId(spaceId),
        abi: rolesFacetAbi,
        functionName: 'getRoles',
    })
    return roles.filter((role) => role.name !== 'Owner')
}

const createChannelTx = async (
    client: BotClient,
    spaceId: string,
    channelId: string,
    params: CreateChannelParams,
) => {
    const roles = await getRoles(client, spaceId)
    const allRolesThatCanRead = roles.filter((role) => role.permissions.includes(Permission.Read))
    const args: [`0x${string}`, string, bigint[]] = [
        channelId.startsWith('0x') ? (channelId as `0x${string}`) : `0x${channelId}`,
        JSON.stringify({ name: params.name, description: params.description ?? '' }),
        allRolesThatCanRead.map((role) => role.id),
    ] as const

    return writeContract(client.viem, {
        address: SpaceAddressFromSpaceId(spaceId),
        abi: channelsFacetAbi,
        functionName: 'createChannel',
        args,
    })
}

export const createChannel = async (
    client: BotClient,
    spaceId: string,
    params: CreateChannelParams,
) => {
    const channelId = makeUniqueChannelStreamId(spaceId)
    const hash = await createChannelTx(client, spaceId, channelId, params)
    const receipt = await waitForTransactionReceipt(client.viem, { hash })
    if (receipt.status !== 'success') {
        throw new Error(`Channel creation transaction failed: ${hash}`)
    }
    const events = await Promise.all([
        makeEvent(
            client.signerContext,
            make_ChannelPayload_Inception({
                streamId: streamIdAsBytes(channelId),
                spaceId: streamIdAsBytes(spaceId),
                settings: undefined,
                channelSettings: {
                    autojoin: params.autojoin ?? false,
                    hideUserJoinLeaveEvents: params.hideUserJoinLeaveEvents ?? false,
                },
            }),
        ),
        makeEvent(
            client.signerContext,
            make_MemberPayload_Membership2({
                userId: client.userId,
                op: MembershipOp.SO_JOIN,
                initiatorId: client.userId,
            }),
        ),
    ])
    // the rpc client will retry a few times on failure, but if this doesn't succeed, the channel will exist on chain but not in the nodes
    await client.rpc.createStream({
        streamId: streamIdAsBytes(channelId),
        events: events,
        metadata: {
            appAddress: bin_fromHexString(client.appAddress),
        },
    })
    return channelId
}
