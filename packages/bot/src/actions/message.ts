import { create, toBinary } from '@bufbuild/protobuf'
import {
    getRefEventIdFromChannelMessage,
    isChannelStreamId,
    make_ChannelPayload_Message,
    unsafe_makeTags,
    userIdFromAddress,
    streamIdAsBytes,
    makeUniqueMediaStreamId,
    addressFromUserId,
    make_MediaPayload_Inception,
    make_MediaPayload_Chunk,
    makeEvent,
    streamIdAsString,
    logNever,
} from '@towns-protocol/sdk'
import {
    type ChannelMessage,
    ChannelMessageSchema,
    type ChannelMessage_Post_Mention,
    type ChannelMessage_Post_Attachment,
    type Tags,
    type PlainMessage,
    ChannelMessage_Post_Content_ImageSchema,
    ChannelMessage_Post_Content_Image_InfoSchema,
    ChannelMessage_Post_AttachmentSchema,
    ChunkedMediaSchema,
    CreationCookieSchema,
} from '@towns-protocol/proto'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import { encryptChunkedAESGCM } from '@towns-protocol/sdk-crypto'
import imageSize from 'image-size'
import { ensureOutboundSession } from './encryption'
import type { BotClient, ParamsWithoutClient } from './types'

export type ImageAttachment = {
    type: 'image'
    alt?: string
    url: string
}

export type ChunkedMediaAttachment =
    | {
          type: 'chunked'
          data: Blob
          width?: number
          height?: number
          filename: string
      }
    | {
          type: 'chunked'
          data: Uint8Array
          width?: number
          height?: number
          filename: string
          mimetype: string
      }

export type LinkAttachment = {
    type: 'link'
    url: string
    title?: string
    description?: string
    image?: {
        width: number
        height: number
        url: string
    }
}

export type MiniAppAttachment = {
    type: 'miniapp'
    url: string
}

export type TickerAttachment = {
    type: 'ticker'
    address: string
    chainId: string
}

export type MessageOpts = {
    threadId?: string
    replyId?: string
    ephemeral?: boolean
}

export type PostMessageOpts = MessageOpts & {
    mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
    attachments?: Array<
        | ImageAttachment
        | ChunkedMediaAttachment
        | LinkAttachment
        | TickerAttachment
        | MiniAppAttachment
    >
}

const CHUNK_SIZE = 1200000 // 1.2MB max per chunk (including auth tag)

const createChunkedMediaAttachment = async (
    client: BotClient,
    attachment: ChunkedMediaAttachment,
): Promise<PlainMessage<ChannelMessage_Post_Attachment>> => {
    let data: Uint8Array
    let mimetype: string

    if (attachment.data instanceof Blob) {
        const buffer = await attachment.data.arrayBuffer()
        data = new Uint8Array(buffer)
        mimetype = attachment.data.type
    } else {
        data = attachment.data
        if ('mimetype' in attachment) {
            mimetype = attachment.mimetype
        } else {
            throw new Error('mimetype is required for Uint8Array data')
        }
    }

    let width = attachment.width || 0
    let height = attachment.height || 0

    if (mimetype.startsWith('image/') && (!width || !height)) {
        const dimensions = imageSize(data)
        width = dimensions.width || 0
        height = dimensions.height || 0
    }

    const { chunks, secretKey } = await encryptChunkedAESGCM(data, CHUNK_SIZE)
    const chunkCount = chunks.length

    if (chunkCount === 0) {
        throw new Error('No media chunks generated')
    }

    // TODO: Implement thumbnail generation with sharp
    const thumbnail = undefined

    const streamId = makeUniqueMediaStreamId()
    const events = await Promise.all([
        makeEvent(
            client.signerContext,
            make_MediaPayload_Inception({
                streamId: streamIdAsBytes(streamId),
                userId: addressFromUserId(client.userId),
                chunkCount,
                perChunkEncryption: true,
            }),
        ),
        makeEvent(
            client.signerContext,
            make_MediaPayload_Chunk({
                data: chunks[0].ciphertext,
                chunkIndex: 0,
                iv: chunks[0].iv,
            }),
        ),
    ])
    const mediaStreamResponse = await client.rpc.createMediaStream({
        events,
        streamId: streamIdAsBytes(streamId),
    })

    if (!mediaStreamResponse?.nextCreationCookie) {
        throw new Error('Failed to create media stream')
    }

    if (chunkCount > 1) {
        let cc = create(CreationCookieSchema, mediaStreamResponse.nextCreationCookie)
        for (let chunkIndex = 1; chunkIndex < chunkCount; chunkIndex++) {
            const chunkEvent = await makeEvent(
                client.signerContext,
                make_MediaPayload_Chunk({
                    data: chunks[chunkIndex].ciphertext,
                    chunkIndex: chunkIndex,
                    iv: chunks[chunkIndex].iv,
                }),
                cc.prevMiniblockHash,
            )
            const result = await client.rpc.addMediaEvent({
                event: chunkEvent,
                creationCookie: cc,
                last: chunkIndex === chunkCount - 1,
            })

            if (!result?.creationCookie) {
                throw new Error('Failed to send media chunk')
            }

            cc = create(CreationCookieSchema, result.creationCookie)
        }
    }

    const mediaStreamInfo = { creationCookie: mediaStreamResponse.nextCreationCookie }

    return {
        content: {
            case: 'chunkedMedia',
            value: create(ChunkedMediaSchema, {
                info: {
                    filename: attachment.filename,
                    mimetype: mimetype,
                    widthPixels: width,
                    heightPixels: height,
                    sizeBytes: BigInt(data.length),
                },
                streamId: streamIdAsString(mediaStreamInfo.creationCookie.streamId),
                encryption: {
                    case: 'aesgcm',
                    value: {
                        iv: new Uint8Array(0),
                        secretKey: secretKey,
                    },
                },
                thumbnail,
            }),
        },
    }
}

const createImageAttachmentFromURL = async (
    attachment: ImageAttachment,
): Promise<PlainMessage<ChannelMessage_Post_Attachment> | null> => {
    try {
        const response = await fetch(attachment.url)
        if (!response.ok) {
            return null
        }
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.startsWith('image/')) {
            // eslint-disable-next-line no-console
            console.warn(
                `A non-image URL attachment was provided. ${attachment.url} (Content-Type: ${contentType || 'unknown'})`,
            )
            return null
        }
        const bytes = await response.bytes()
        const dimensions = imageSize(bytes)
        const width = dimensions.width || 0
        const height = dimensions.height || 0
        const image = create(ChannelMessage_Post_Content_ImageSchema, {
            title: attachment.alt || '',
            info: create(ChannelMessage_Post_Content_Image_InfoSchema, {
                url: attachment.url,
                mimetype: contentType,
                width,
                height,
            }),
        })

        return {
            content: {
                case: 'image',
                value: image,
            },
        }
    } catch {
        return null
    }
}

const createLinkAttachment = (
    attachment: LinkAttachment,
): PlainMessage<ChannelMessage_Post_Attachment> => {
    return create(ChannelMessage_Post_AttachmentSchema, {
        content: {
            case: 'unfurledUrl',
            value: {
                url: attachment.url,
                image: attachment.image,
                title: attachment.title ?? '',
                description: attachment.description ?? '',
            },
        },
    })
}

const createTickerAttachment = (
    attachment: TickerAttachment,
): PlainMessage<ChannelMessage_Post_Attachment> => {
    return create(ChannelMessage_Post_AttachmentSchema, {
        content: {
            case: 'ticker',
            value: {
                address: attachment.address,
                chainId: attachment.chainId,
            },
        },
    })
}

const createMiniAppAttachment = (
    attachment: MiniAppAttachment,
): PlainMessage<ChannelMessage_Post_Attachment> => {
    return create(ChannelMessage_Post_AttachmentSchema, {
        content: {
            case: 'miniapp',
            value: { url: attachment.url },
        },
    })
}

// Process all attachments for a message
const processAttachments = async (
    client: BotClient,
    attachments?: Array<
        | ImageAttachment
        | ChunkedMediaAttachment
        | LinkAttachment
        | TickerAttachment
        | MiniAppAttachment
    >,
): Promise<Array<PlainMessage<ChannelMessage_Post_Attachment> | null>> => {
    const processed: Array<PlainMessage<ChannelMessage_Post_Attachment> | null> = []

    if (!attachments || attachments.length === 0) {
        return processed
    }

    for (const attachment of attachments) {
        switch (attachment.type) {
            case 'image': {
                const result = await createImageAttachmentFromURL(attachment)
                processed.push(result)
                break
            }
            case 'chunked': {
                const result = await createChunkedMediaAttachment(client, attachment)
                processed.push(result)
                break
            }
            case 'link': {
                const result = createLinkAttachment(attachment)
                processed.push(result)
                break
            }
            case 'ticker': {
                const result = createTickerAttachment(attachment)
                processed.push(result)
                break
            }
            case 'miniapp': {
                const result = createMiniAppAttachment(attachment)
                processed.push(result)
                break
            }
            default:
                logNever(attachment)
        }
    }

    return processed
}

export const sendMessageEvent = async ({
    client,
    streamId,
    payload,
    tags,
    ephemeral,
}: {
    client: BotClient
    streamId: string
    payload: ChannelMessage
    tags?: PlainMessage<Tags>
    ephemeral?: boolean
}) => {
    const miniblockInfo = await client.getMiniblockInfo(streamId)
    const eventTags = {
        ...unsafe_makeTags(payload),
        participatingUserAddresses: tags?.participatingUserAddresses || [],
        threadId: tags?.threadId || undefined,
    }
    const encryptionAlgorithm = miniblockInfo.encryptionAlgorithm?.algorithm
        ? (miniblockInfo.encryptionAlgorithm.algorithm as GroupEncryptionAlgorithmId)
        : client.defaultGroupEncryptionAlgorithm

    await ensureOutboundSession(
        client,
        streamId,
        encryptionAlgorithm,
        Array.from(
            new Set([
                ...eventTags.participatingUserAddresses.map((x) => userIdFromAddress(x)),
                ...eventTags.mentionedUserAddresses.map((x) => userIdFromAddress(x)),
            ]),
        ),
        miniblockInfo,
    )

    const message = await client.crypto.encryptGroupEvent(
        streamId,
        toBinary(ChannelMessageSchema, payload),
        encryptionAlgorithm,
    )
    message.refEventId = getRefEventIdFromChannelMessage(payload)

    if (!isChannelStreamId(streamId)) {
        throw new Error(`Invalid stream ID type: ${streamId} - only channel streams are supported`)
    }
    const eventPayload = make_ChannelPayload_Message(message)
    return client.sendEvent(streamId, eventPayload, eventTags, ephemeral)
}

export type SendMessageParams = ParamsWithoutClient<typeof sendMessage>
export type EditMessageParams = ParamsWithoutClient<typeof editMessage>
export type SendReactionParams = ParamsWithoutClient<typeof sendReaction>
export type RemoveEventParams = ParamsWithoutClient<typeof removeEvent>

export const sendMessage = async (
    client: BotClient,
    streamId: string,
    message: string,
    opts?: PostMessageOpts,
    tags?: PlainMessage<Tags>,
) => {
    const processedAttachments = await processAttachments(client, opts?.attachments)

    const payload = create(ChannelMessageSchema, {
        payload: {
            case: 'post',
            value: {
                threadId: opts?.threadId,
                replyId: opts?.replyId,
                replyPreview: opts?.replyId ? '🙈' : undefined,
                threadPreview: opts?.threadId ? '🙉' : undefined,
                content: {
                    case: 'text',
                    value: {
                        body: message,
                        attachments: processedAttachments.filter((x) => x !== null),
                        mentions: opts?.mentions || [],
                    },
                },
            },
        },
    })
    return sendMessageEvent({ client, streamId, payload, tags, ephemeral: opts?.ephemeral })
}

export const editMessage = async (
    client: BotClient,
    streamId: string,
    messageId: string,
    message: string,
    opts?: PostMessageOpts,
    tags?: PlainMessage<Tags>,
) => {
    const processedAttachments = await processAttachments(client, opts?.attachments)

    const payload = create(ChannelMessageSchema, {
        payload: {
            case: 'edit',
            value: {
                refEventId: messageId,
                post: {
                    threadId: opts?.threadId,
                    replyId: opts?.replyId,
                    replyPreview: opts?.replyId ? '🙈' : undefined,
                    threadPreview: opts?.threadId ? '🙉' : undefined,
                    content: {
                        case: 'text',
                        value: {
                            body: message,
                            mentions: opts?.mentions || [],
                            attachments: processedAttachments.filter((x) => x !== null),
                        },
                    },
                },
            },
        },
    })
    return sendMessageEvent({ client, streamId, payload, tags, ephemeral: opts?.ephemeral })
}

export const sendReaction = async (
    client: BotClient,
    streamId: string,
    messageId: string,
    reaction: string,
    tags?: PlainMessage<Tags>,
) => {
    const payload = create(ChannelMessageSchema, {
        payload: { case: 'reaction', value: { refEventId: messageId, reaction } },
    })
    return sendMessageEvent({ client, streamId, payload, tags })
}

export const removeEvent = async (
    client: BotClient,
    streamId: string,
    messageId: string,
    tags?: PlainMessage<Tags>,
) => {
    const payload = create(ChannelMessageSchema, {
        payload: { case: 'redaction', value: { refEventId: messageId } },
    })
    return sendMessageEvent({ client, streamId, payload, tags })
}
