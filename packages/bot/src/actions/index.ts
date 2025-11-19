import type { ClientV2 } from '@towns-protocol/sdk'
import type { SpaceDapp } from '@towns-protocol/web3'
import type { WalletClient, Transport, Chain, Account, Address } from 'viem'

import {
    type EditMessageParams,
    type RemoveEventParams,
    type SendMessageParams,
    type SendReactionParams,
    editMessage,
    removeEvent,
    sendMessage,
    sendReaction,
} from './message'
import {
    type SendInteractionRequestParams,
    sendInteractionRequest,
    type SendGMParams,
    sendGM,
    type SendRawGMParams,
    sendRawGM,
} from './interaction'
import {
    type SendBlockchainTransactionParams,
    sendBlockchainTransaction,
    type SendTipParams,
    sendTip,
} from './tip'
import {
    type AdminRemoveEventParams,
    type BanParams,
    adminRemoveEvent,
    ban,
    unban,
    type UnbanParams,
} from './moderation'
import {
    type CheckPermissionParams,
    type HasAdminPermissionParams,
    checkPermission,
    hasAdminPermission,
} from './permissions'
import {
    type SendKeySolicitationParams,
    type UploadDeviceKeysParams,
    sendKeySolicitation,
    uploadDeviceKeys,
} from './encryption'
import {
    type CreateChannelActionParams,
    type GetChannelSettingsParams,
    type GetRolesParams,
    createChannel,
    getChannelSettings,
    getRoles,
} from './channel'
import { type PinMessageParams, pinMessage, type UnpinMessageParams, unpinMessage } from './pinning'
import type { BotClient } from './types'

// Represents the `handler` parameter of `BotEvents`
// bot.onMessage(async (handler, event) => { ... })
//                      ˆˆˆˆˆˆˆ
// You can also use this action in `bot.client`
export const buildBotActions = (
    client: ClientV2,
    viem: WalletClient<Transport, Chain, Account>,
    spaceDapp: SpaceDapp,
    appAddress: Address,
) => {
    const botClient = Object.assign(client, {
        viem,
        spaceDapp,
        appAddress,
    }) as BotClient

    return {
        sendMessage: (...params: SendMessageParams) => sendMessage(botClient, ...params),
        editMessage: (...params: EditMessageParams) => editMessage(botClient, ...params),
        sendReaction: (...params: SendReactionParams) => sendReaction(botClient, ...params),
        sendInteractionRequest: (...params: SendInteractionRequestParams) =>
            sendInteractionRequest(botClient, ...params),
        sendGM: (...params: SendGMParams) => sendGM(botClient, ...params),
        sendRawGM: (...params: SendRawGMParams) => sendRawGM(botClient, ...params),
        removeEvent: (...params: RemoveEventParams) => removeEvent(botClient, ...params),
        adminRemoveEvent: (...params: AdminRemoveEventParams) =>
            adminRemoveEvent(botClient, ...params),
        sendKeySolicitation: (...params: SendKeySolicitationParams) =>
            sendKeySolicitation(botClient, ...params),
        uploadDeviceKeys: (...params: UploadDeviceKeysParams) =>
            uploadDeviceKeys(botClient, ...params),
        hasAdminPermission: (...params: HasAdminPermissionParams) =>
            hasAdminPermission(botClient, ...params),
        checkPermission: (...params: CheckPermissionParams) =>
            checkPermission(botClient, ...params),
        ban: (...params: BanParams) => ban(botClient, ...params),
        unban: (...params: UnbanParams) => unban(botClient, ...params),
        pinMessage: (...params: PinMessageParams) => pinMessage(botClient, ...params),
        unpinMessage: (...params: UnpinMessageParams) => unpinMessage(botClient, ...params),
        getChannelSettings: (...params: GetChannelSettingsParams) =>
            getChannelSettings(botClient, ...params),
        sendTip: (...params: SendTipParams) => sendTip(botClient, ...params),
        sendBlockchainTransaction: (...params: SendBlockchainTransactionParams) =>
            sendBlockchainTransaction(botClient, ...params),
        createChannel: (...params: CreateChannelActionParams) =>
            createChannel(botClient, ...params),
        getRoles: (...params: GetRolesParams) => getRoles(botClient, ...params),
    }
}

export type BotActions = ReturnType<typeof buildBotActions>

// Re-export types used in bot.ts
export type { PostMessageOpts, MessageOpts } from './message'
export type { CreateChannelParams } from './channel'
