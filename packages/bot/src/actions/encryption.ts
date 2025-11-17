import {
    make_MemberPayload_KeySolicitation,
    make_UserMetadataPayload_EncryptionDevice,
    makeUserMetadataStreamId,
    streamIdAsBytes,
    userIdToAddress,
    unpackEnvelope,
} from '@towns-protocol/sdk'
import { check } from '@towns-protocol/utils'
import type { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import type { BotClient, ParamsWithoutClient } from './types'

export type UploadDeviceKeysParams = ParamsWithoutClient<typeof uploadDeviceKeys>
export type SendKeySolicitationParams = ParamsWithoutClient<typeof sendKeySolicitation>

export const uploadDeviceKeys = async (client: BotClient) => {
    const streamId = makeUserMetadataStreamId(client.userId)
    const encryptionDevice = client.crypto.getUserDevice()

    return client.sendEvent(
        streamId,
        make_UserMetadataPayload_EncryptionDevice({
            ...encryptionDevice,
        }),
    )
}

export const sendKeySolicitation = async (
    client: BotClient,
    streamId: string,
    sessionIds: string[],
) => {
    const encryptionDevice = client.crypto.getUserDevice()
    const missingSessionIds = sessionIds.filter((sessionId) => sessionId !== '')

    return client.sendEvent(
        streamId,
        make_MemberPayload_KeySolicitation({
            deviceKey: encryptionDevice.deviceKey,
            fallbackKey: encryptionDevice.fallbackKey,
            isNewDevice: missingSessionIds.length === 0,
            sessionIds: missingSessionIds,
        }),
    )
}

// Helper function used internally by message actions
export const ensureOutboundSession = async (
    client: BotClient,
    streamId: string,
    encryptionAlgorithm: GroupEncryptionAlgorithmId,
    toUserIds: string[],
    miniblockInfo: { miniblockNum: bigint; miniblockHash: Uint8Array },
) => {
    if (!(await client.crypto.hasOutboundSession(streamId, encryptionAlgorithm))) {
        // ATTEMPT 1: Get session from app service
        const appService = await client.appServiceClient()
        try {
            const sessionResp = await appService.getSession({
                appId: userIdToAddress(client.userId),
                identifier: {
                    case: 'streamId',
                    value: streamIdAsBytes(streamId),
                },
            })
            if (sessionResp.groupEncryptionSessions) {
                const parsedEvent = await unpackEnvelope(
                    sessionResp.groupEncryptionSessions,
                    client.unpackEnvelopeOpts,
                )
                check(
                    parsedEvent.event.payload.case === 'userInboxPayload' &&
                        parsedEvent.event.payload.value.content.case === 'groupEncryptionSessions',
                    'invalid event payload',
                )
                await client.importGroupEncryptionSessions({
                    streamId,
                    sessions: parsedEvent.event.payload.value.content.value,
                })
                // EARLY RETURN
                return
            }
        } catch {
            // ignore error (should log)
        }
        // ATTEMPT 2: Create new session
        await client.crypto.ensureOutboundSession(streamId, encryptionAlgorithm, {
            shareShareSessionTimeoutMs: 5000,
            priorityUserIds: [client.userId, ...toUserIds],
            miniblockInfo,
        })
    }
}
