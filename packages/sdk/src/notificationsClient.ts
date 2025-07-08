import {
    DmChannelSettingValue,
    FinishAuthenticationResponse,
    GdmChannelSettingValue,
    GetSettingsResponse,
    SpaceChannelSettingValue,
    WebPushSubscriptionObject,
    PlainMessage,
    StartAuthenticationResponseSchema,
    FinishAuthenticationResponseSchema,
    GetSettingsResponseSchema,
    DmChannelSettingSchema,
    GdmChannelSettingSchema,
    SpaceSettingSchema,
    SpaceChannelSettingSchema,
} from '@towns-protocol/proto'
import { create, DescMessage, fromBinary, MessageShape, toBinary, toJson } from '@bufbuild/protobuf'
import { bin_fromBase64, bin_toBase64, dlogger } from '@towns-protocol/dlog'
import { cloneDeep } from 'lodash-es'
import { makeNotificationRpcClient, NotificationRpcClient } from './makeNotificationRpcClient'
import { SignerContext } from './signerContext'
import { RpcOptions } from './rpcCommon'
import { NotificationService } from './notificationService'
import { spaceIdFromChannelId, streamIdAsBytes, streamIdAsString, userIdFromAddress } from './id'
import { StreamsView } from './views/streamsView'
import { NotificationSettingsModel } from './views/streams/notificationSettings'

const logger = dlogger('csb:notifications')

export interface INotificationStore {
    getItem<Desc extends DescMessage>(schema: Desc, key: string): MessageShape<Desc> | undefined
    setItem<Desc extends DescMessage>(schema: Desc, key: string, value: MessageShape<Desc>): void
}

class InMemoryNotificationStore implements INotificationStore {
    private store: Record<string, string> = {}
    getItem<Desc extends DescMessage>(schema: Desc, key: string): MessageShape<Desc> | undefined {
        const data = this.store[`${schema.typeName}-${key}`]
        return data ? fromBinary(schema, bin_fromBase64(data)) : undefined
    }
    setItem<Desc extends DescMessage>(schema: Desc, key: string, value: MessageShape<Desc>): void {
        this.store[`${schema.typeName}-${key}`] = bin_toBase64(toBinary(schema, value))
    }
}

export class NotificationsClient {
    get notificationSettings(): NotificationSettingsModel {
        return this.streamsView.notificationSettings.value
    }
    private _client?: NotificationRpcClient
    private startResponseKey: string
    private finishResponseKey: string
    private settingsKey: string
    private getClientPromise: Promise<NotificationRpcClient | undefined> | undefined
    private getSettingsPromise: Promise<GetSettingsResponse | undefined> | undefined

    constructor(
        private readonly signerContext: SignerContext,
        private readonly url: string,
        private readonly store: INotificationStore = new InMemoryNotificationStore(),
        private readonly opts: RpcOptions | undefined = undefined,
        readonly streamsView: StreamsView,
    ) {
        this.startResponseKey = `startResponse`
        this.finishResponseKey = `finishResponse`
        this.settingsKey = `settings`
        this.streamsView.notificationSettings.initializeSettings(this.getLocalSettings())
    }

    get userId(): string {
        return userIdFromAddress(this.signerContext.creatorAddress)
    }

    private getLocalStartResponse():
        | MessageShape<typeof StartAuthenticationResponseSchema>
        | undefined {
        return this.store.getItem(StartAuthenticationResponseSchema, this.startResponseKey)
    }

    private setLocalStartResponse(
        response: MessageShape<typeof StartAuthenticationResponseSchema>,
    ) {
        this.store.setItem(StartAuthenticationResponseSchema, this.startResponseKey, response)
    }

    private getLocalFinishResponse(): FinishAuthenticationResponse | undefined {
        return this.store.getItem(FinishAuthenticationResponseSchema, this.finishResponseKey)
    }

    private setLocalFinishResponse(response: FinishAuthenticationResponse) {
        this.store.setItem(FinishAuthenticationResponseSchema, this.finishResponseKey, response)
    }

    private getLocalSettings(): GetSettingsResponse | undefined {
        return this.store.getItem(GetSettingsResponseSchema, this.settingsKey)
    }

    private setLocalSettings(settings: GetSettingsResponse) {
        this.store.setItem(GetSettingsResponseSchema, this.settingsKey, settings)
    }

    private updateLocalSettings(fn: (current: GetSettingsResponse) => void) {
        if (!this.streamsView.notificationSettings.value.settings) {
            throw new Error('TNS PUSH: settings has not been fetched')
        }
        const newSettings = cloneDeep(this.streamsView.notificationSettings.value.settings)
        fn(newSettings)
        this.setLocalSettings(newSettings)
        this.streamsView.notificationSettings.updateSettings(newSettings)
    }

    private async getClient(): Promise<NotificationRpcClient | undefined> {
        if (this.getClientPromise) {
            return this.getClientPromise
        }
        try {
            this.getClientPromise = this._getClient()
            const result = await this.getClientPromise
            this.getClientPromise = undefined
            return result
        } catch (error) {
            this.streamsView.notificationSettings.updateError(error as Error)
            this.getClientPromise = undefined
            return undefined
        }
    }

    private async _getClient(): Promise<NotificationRpcClient | undefined> {
        const startResponse = this.getLocalStartResponse()
        const finishResponse = this.getLocalFinishResponse()

        // if we have a valid start response and finish response, and the start response is still valid,
        // we can re-create the client from the local storage
        // and cache it locally to leverage http2 connection pooling
        if (
            startResponse &&
            finishResponse &&
            startResponse.expiration &&
            startResponse.expiration.seconds > Date.now() / 1000
        ) {
            if (this._client) {
                // if everything is still valid, and we have the client, return the client
                return this._client
            }
            try {
                const client = makeNotificationRpcClient(
                    this.url,
                    finishResponse.sessionToken,
                    this.opts,
                )
                this._client = client
                return client
            } catch (error) {
                logger.error(
                    'TNS PUSH: error authenticating from local storage, will try from scratch',
                    error,
                )
            }
        }
        // if we don't have a valid client, or if the client has expired,we need to authenticate from scratch
        const service = await NotificationService.authenticate(
            this.signerContext,
            this.url,
            this.opts,
        )
        this.setLocalStartResponse(service.startResponse)
        this.setLocalFinishResponse(service.finishResponse)
        return service.notificationRpcClient
    }

    private async withClient<T>(
        fn: (client: NotificationRpcClient) => Promise<T>,
    ): Promise<T | undefined> {
        const client = await this.getClient()
        if (client) {
            try {
                return await fn(client)
            } catch (error) {
                this.streamsView.notificationSettings.updateError(error as Error)
                throw error
            }
        }
        // either an error is already logged or the initialize threw an error
        return undefined
    }

    async getSettings(): Promise<GetSettingsResponse | undefined> {
        if (this.getSettingsPromise) {
            return this.getSettingsPromise
        }
        this.getSettingsPromise = this._getSettings()
        return this.getSettingsPromise
    }

    private async _getSettings(): Promise<GetSettingsResponse | undefined> {
        return this.withClient(async (client) => {
            try {
                const response = await client.getSettings({})
                this.setLocalSettings(response)
                this.streamsView.notificationSettings.updateSettings(response, Date.now())
                logger.log(
                    'TNS PUSH: fetched settings',
                    toJson(GetSettingsResponseSchema, response),
                )
                this.getSettingsPromise = undefined
                return response
            } catch (error) {
                this.streamsView.notificationSettings.updateError(error as Error)
                throw error
            }
        })
    }

    async subscribeWebPush(subscription: PlainMessage<WebPushSubscriptionObject>) {
        return this.withClient(async (client) => {
            logger.log('TNS PUSH: subscribing to web push')
            return client.subscribeWebPush({ subscription })
        })
    }

    async unsubscribeWebPush(subscription: PlainMessage<WebPushSubscriptionObject>) {
        return this.withClient(async (client) => {
            logger.log('TNS PUSH: unsubscribing to web push')
            return client.unsubscribeWebPush({ subscription })
        })
    }

    async setDmGlobalSetting(value: DmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmGdmSettings({
                dmGlobal: value,
                gdmGlobal:
                    this.notificationSettings.settings?.gdmGlobal ??
                    GdmChannelSettingValue.GDM_UNSPECIFIED,
            })
            this.updateLocalSettings((settings) => {
                settings.dmGlobal = value
            })
        })
    }

    async setGdmGlobalSetting(value: GdmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmGdmSettings({
                dmGlobal:
                    this.notificationSettings.settings?.dmGlobal ??
                    DmChannelSettingValue.DM_UNSPECIFIED,
                gdmGlobal: value,
            })

            this.updateLocalSettings((settings) => {
                settings.gdmGlobal = value
            })
        })
    }

    async setDmChannelSetting(channelId: string, value: DmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmChannelSetting({
                dmChannelId: streamIdAsBytes(channelId),
                value,
            })
            this.updateLocalSettings((settings) => {
                settings.dmChannels = settings.dmChannels.filter(
                    (c) => streamIdAsString(c.channelId) !== channelId,
                )
                settings.dmChannels.push(
                    create(DmChannelSettingSchema, {
                        channelId: streamIdAsBytes(channelId),
                        value,
                    }),
                )
            })
        })
    }

    async setGdmChannelSetting(channelId: string, value: GdmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setGdmChannelSetting({
                gdmChannelId: streamIdAsBytes(channelId),
                value,
            })
            this.updateLocalSettings((settings) => {
                settings.gdmChannels = settings.gdmChannels.filter(
                    (c) => streamIdAsString(c.channelId) !== channelId,
                )
                settings.gdmChannels.push(
                    create(GdmChannelSettingSchema, {
                        channelId: streamIdAsBytes(channelId),
                        value,
                    }),
                )
            })
        })
    }

    async setSpaceSetting(spaceId: string, value: SpaceChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setSpaceSettings({ spaceId: streamIdAsBytes(spaceId), value })
            this.updateLocalSettings((settings) => {
                const spaceIndex = settings.space.findIndex(
                    (s) => streamIdAsString(s.spaceId) === spaceId,
                )
                if (spaceIndex != -1) {
                    settings.space[spaceIndex].value = value
                } else {
                    settings.space.push(
                        create(SpaceSettingSchema, {
                            spaceId: streamIdAsBytes(spaceId),
                            value,
                            channels: [],
                        }),
                    )
                }
            })
        })
    }

    async setChannelSetting(channelId: string, value: SpaceChannelSettingValue) {
        const spaceId = spaceIdFromChannelId(channelId)
        return this.withClient(async (client) => {
            await client.setSpaceChannelSettings({
                spaceId: streamIdAsBytes(spaceId),
                channelId: streamIdAsBytes(channelId),
                value,
            })
            this.updateLocalSettings((settings) => {
                let spaceIndex = settings.space.findIndex(
                    (s) => streamIdAsString(s.spaceId) === spaceId,
                )
                if (spaceIndex == -1) {
                    spaceIndex = settings.space.length
                    settings.space.push(
                        create(SpaceSettingSchema, {
                            spaceId: streamIdAsBytes(spaceId),
                            value: SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED,
                            channels: [],
                        }),
                    )
                }
                const channelIndex = settings.space[spaceIndex].channels.findIndex(
                    (c) => streamIdAsString(c.channelId) === channelId,
                )
                if (channelIndex == -1) {
                    settings.space[spaceIndex].channels.push(
                        create(SpaceChannelSettingSchema, {
                            channelId: streamIdAsBytes(channelId),
                            value,
                        }),
                    )
                } else {
                    settings.space[spaceIndex].channels[channelIndex].value = value
                }
            })
        })
    }
}

export function getMutedChannelIds(settings?: PlainMessage<GetSettingsResponse>) {
    if (!settings) {
        return undefined
    }
    const ids = new Set<string>()
    for (const spaceSetting of settings.space) {
        if (
            spaceSetting.value ===
            SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
        ) {
            ids.add(streamIdAsString(spaceSetting.spaceId))
        }
        for (const channelSetting of spaceSetting.channels) {
            if (
                channelSetting.value ===
                SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
            ) {
                ids.add(streamIdAsString(channelSetting.channelId))
            }
        }
    }
    for (const dmSetting of settings.dmChannels) {
        if (dmSetting.value === DmChannelSettingValue.DM_MESSAGES_NO_AND_MUTE) {
            ids.add(streamIdAsString(dmSetting.channelId))
        }
    }
    for (const gdmSetting of settings.gdmChannels) {
        if (gdmSetting.value === GdmChannelSettingValue.GDM_MESSAGES_NO_AND_MUTE) {
            ids.add(streamIdAsString(gdmSetting.channelId))
        }
    }
    return ids
}
