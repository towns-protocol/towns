import { create, toBinary } from '@bufbuild/protobuf'
import { make_ChannelPayload_InteractionRequest, userIdFromAddress } from '@towns-protocol/sdk'
import {
    InteractionRequestPayloadSchema,
    type InteractionRequestPayload,
    type InteractionRequest,
    type Tags,
    type PlainMessage,
    ChannelMessageSchema,
} from '@towns-protocol/proto'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import { ensureOutboundSession } from './encryption'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { stringify as superjsonStringify } from 'superjson'
import { sendMessageEvent, type MessageOpts } from './message'
import type { BotClient, ParamsWithoutClient } from './types'

export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
>['input']

export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
>['input']

export type SendInteractionRequestParams = ParamsWithoutClient<typeof sendInteractionRequest>
export type SendGMParams = ParamsWithoutClient<typeof sendGM>
export type SendRawGMParams = ParamsWithoutClient<typeof sendRawGM>

export const sendInteractionRequest = async (
    client: BotClient,
    streamId: string,
    content: PlainMessage<InteractionRequestPayload['content']>,
    recipient?: Uint8Array,
    opts?: MessageOpts,
    tags?: PlainMessage<Tags>,
) => {
    // Get encryption settings
    const miniblockInfo = await client.getMiniblockInfo(streamId)
    const encryptionAlgorithm = miniblockInfo.encryptionAlgorithm?.algorithm
        ? (miniblockInfo.encryptionAlgorithm.algorithm as GroupEncryptionAlgorithmId)
        : client.defaultGroupEncryptionAlgorithm

    await ensureOutboundSession(
        client,
        streamId,
        encryptionAlgorithm,
        recipient ? [userIdFromAddress(recipient)] : [],
        miniblockInfo,
    )

    // Create payload with content and encryption device for response
    const payload = create(InteractionRequestPayloadSchema, {
        encryptionDevice: client.crypto.getUserDevice(),
        content: content,
    })

    // Encrypt using group encryption
    const encryptedData = await client.crypto.encryptGroupEvent(
        streamId,
        toBinary(InteractionRequestPayloadSchema, payload),
        encryptionAlgorithm,
    )

    // Create the request
    const request: PlainMessage<InteractionRequest> = {
        recipient: recipient,
        encryptedData: encryptedData,
    }

    // Send as InteractionRequest
    const eventPayload = make_ChannelPayload_InteractionRequest(request)
    return client.sendEvent(streamId, eventPayload, tags, opts?.ephemeral)
}

export async function sendGM<Schema extends StandardSchemaV1>(
    client: BotClient,
    streamId: string,
    typeUrl: string,
    schema: Schema,
    data: InferInput<Schema>,
    opts?: MessageOpts,
    tags?: PlainMessage<Tags>,
): Promise<{ eventId: string }> {
    const result = await schema['~standard'].validate(data)
    if ('issues' in result && result.issues) {
        throw new Error(
            `Schema validation failed: ${result.issues.map((issue) => issue.message).join(', ')}`,
        )
    }
    const jsonString = superjsonStringify(result.value)
    const jsonBytesMessage = new TextEncoder().encode(jsonString)
    const payload = create(ChannelMessageSchema, {
        payload: {
            case: 'post',
            value: {
                threadId: opts?.threadId,
                replyId: opts?.replyId,
                replyPreview: opts?.replyId ? '🙈' : undefined,
                threadPreview: opts?.threadId ? '🙉' : undefined,
                content: { case: 'gm', value: { typeUrl: typeUrl, value: jsonBytesMessage } },
            },
        },
    })
    return sendMessageEvent({
        client,
        streamId,
        payload,
        tags,
        ephemeral: opts?.ephemeral,
    })
}

export const sendRawGM = async (
    client: BotClient,
    streamId: string,
    typeUrl: string,
    message: Uint8Array,
    opts?: MessageOpts,
    tags?: PlainMessage<Tags>,
) => {
    const payload = create(ChannelMessageSchema, {
        payload: {
            case: 'post',
            value: {
                threadId: opts?.threadId,
                replyId: opts?.replyId,
                replyPreview: opts?.replyId ? '🙈' : undefined,
                threadPreview: opts?.threadId ? '🙉' : undefined,
                content: { case: 'gm', value: { typeUrl: typeUrl, value: message } },
            },
        },
    })
    return sendMessageEvent({
        client,
        streamId,
        payload,
        tags,
        ephemeral: opts?.ephemeral,
    })
}
