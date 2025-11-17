import { create } from '@bufbuild/protobuf'
import {
    spaceIdFromChannelId,
    makeUserStreamId,
    make_UserPayload_BlockchainTransaction,
} from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/utils'
import {
    ETH_ADDRESS,
    SpaceAddressFromSpaceId,
    type SendTipMemberParams,
    TipRecipientType,
} from '@towns-protocol/web3'
import type { Address, TransactionReceipt } from 'viem'
import { encodeAbiParameters, zeroAddress, parseEventLogs } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
import { execute } from 'viem/experimental/erc7821'
import {
    BlockchainTransactionSchema,
    type BlockchainTransaction,
    type Tags,
    type PlainMessage,
    MessageInteractionType,
} from '@towns-protocol/proto'
import tippingFacetAbi from '@towns-protocol/generated/dev/abis/ITipping.abi'
import { getSmartAccountFromUserIdImpl } from '../getSmartAccountFromUserId'
import type { BotClient, ParamsWithoutClient } from './types'

export type SendBlockchainTransactionParams = ParamsWithoutClient<typeof sendBlockchainTransaction>
export type SendTipParams = ParamsWithoutClient<typeof sendTip>

export const sendBlockchainTransaction = async (
    client: BotClient,
    chainId: number,
    receipt: TransactionReceipt,
    content?: PlainMessage<BlockchainTransaction>['content'],
    tags?: PlainMessage<Tags>,
): Promise<{ txHash: string; eventId: string }> => {
    const transaction = create(BlockchainTransactionSchema, {
        receipt: {
            chainId: BigInt(chainId),
            transactionHash: bin_fromHexString(receipt.transactionHash),
            blockNumber: receipt.blockNumber,
            to: bin_fromHexString(receipt.to || zeroAddress),
            from: bin_fromHexString(receipt.from),
            logs: receipt.logs.map((log) => ({
                address: bin_fromHexString(log.address),
                topics: log.topics.map((topic) => bin_fromHexString(topic)),
                data: bin_fromHexString(log.data),
            })),
        },
        solanaReceipt: undefined,
        content: content ?? { case: undefined },
    })

    const result = await client.sendEvent(
        makeUserStreamId(client.userId),
        make_UserPayload_BlockchainTransaction(transaction),
        tags,
    )
    return { txHash: receipt.transactionHash, eventId: result.eventId }
}

const sendTipImpl = async (
    client: BotClient,
    params: Omit<SendTipMemberParams, 'spaceId' | 'tokenId' | 'currency'> & {
        currency?: Address
        receiverUserId: string
    },
    tags?: PlainMessage<Tags>,
): Promise<{ txHash: string; eventId: string }> => {
    const currency = params.currency ?? ETH_ADDRESS
    const isEth = currency === ETH_ADDRESS
    const { receiver, amount, messageId, channelId } = params
    const spaceId = spaceIdFromChannelId(channelId)
    const tokenId = await client.spaceDapp.getTokenIdOfOwner(spaceId, receiver)
    if (!tokenId) {
        throw new Error(`No token ID found for user ${receiver} in space ${spaceId}`)
    }

    const recipientType = TipRecipientType.Member

    const metadataData = encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }],
        [`0x${messageId}`, `0x${channelId}`, BigInt(tokenId)],
    )

    // TODO: Get the modular account address for the receiver (towns app case)
    const encodedData = encodeAbiParameters(
        [
            {
                type: 'tuple',
                components: [
                    { name: 'receiver', type: 'address' },
                    { name: 'tokenId', type: 'uint256' },
                    { name: 'currency', type: 'address' },
                    { name: 'amount', type: 'uint256' },
                    {
                        name: 'metadata',
                        type: 'tuple',
                        components: [
                            { name: 'messageId', type: 'bytes32' },
                            { name: 'channelId', type: 'bytes32' },
                            { name: 'data', type: 'bytes' },
                        ],
                    },
                ],
            },
        ],
        [
            {
                receiver,
                amount,
                currency,
                tokenId: BigInt(tokenId),
                metadata: {
                    messageId: `0x${messageId}`,
                    channelId: `0x${channelId}`,
                    data: metadataData,
                },
            },
        ],
    )
    const hash = await execute(client.viem, {
        address: client.appAddress,
        calls: [
            {
                abi: tippingFacetAbi,
                to: SpaceAddressFromSpaceId(spaceId),
                functionName: 'sendTip',
                args: [recipientType, encodedData],
                value: isEth ? amount : undefined,
            },
        ],
    })

    const receipt = await waitForTransactionReceipt(client.viem, { hash, confirmations: 3 })
    if (receipt.status !== 'success') {
        throw new Error(`Tip transaction failed: ${hash}`)
    }
    const tipEvent = parseEventLogs({
        abi: tippingFacetAbi,
        logs: receipt.logs,
        eventName: 'TipSent',
    })[0]

    return sendBlockchainTransaction(
        client,
        client.viem.chain.id,
        receipt,
        {
            case: 'tip',
            value: {
                event: {
                    tokenId: BigInt(tokenId),
                    currency: bin_fromHexString(tipEvent.args.currency),
                    sender: bin_fromHexString(tipEvent.args.sender),
                    receiver: bin_fromHexString(tipEvent.args.receiver),
                    amount: tipEvent.args.amount,
                    messageId: bin_fromHexString(messageId),
                    channelId: bin_fromHexString(channelId),
                },
                toUserAddress: bin_fromHexString(params.receiverUserId),
            },
        },
        {
            groupMentionTypes: tags?.groupMentionTypes || [],
            mentionedUserAddresses: tags?.mentionedUserAddresses || [],
            threadId: tags?.threadId,
            appClientAddress: tags?.appClientAddress,
            messageInteractionType: MessageInteractionType.TIP,
            participatingUserAddresses: [bin_fromHexString(params.receiverUserId)],
        },
    )
}

export const sendTip = async (
    client: BotClient,
    params: Omit<SendTipMemberParams, 'spaceId' | 'tokenId' | 'currency' | 'receiver'> & {
        currency?: Address
        userId: Address
    },
    tags?: PlainMessage<Tags>,
): Promise<{ txHash: string; eventId: string }> => {
    const smartAccountAddress = await getSmartAccountFromUserIdImpl(
        client.config.base.chainConfig.addresses.spaceFactory,
        client.viem,
        params.userId,
    )

    return sendTipImpl(
        client,
        {
            ...params,
            receiver: smartAccountAddress ?? params.userId,
            receiverUserId: params.userId,
        },
        tags,
    )
}
