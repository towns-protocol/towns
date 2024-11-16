import {
    DmChannelSettingValue,
    FinishAuthenticationResponse,
    GdmChannelSettingValue,
    GetSettingsResponse,
    SpaceChannelSettingValue,
    StartAuthenticationResponse,
    WebPushSubscriptionObject,
} from '@river-build/proto'
import {
    SignerContext,
    NotificationService,
    userIdFromAddress,
    makeNotificationRpcClient,
    RpcOptions,
    NotificationRpcClient,
    Observable,
    spaceIdFromChannelId,
    streamIdAsBytes,
    streamIdAsString,
} from '@river-build/sdk'
import { Message, PlainMessage } from '@bufbuild/protobuf'
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { bin_fromHexString, bin_toHexString } from '@river-build/dlog'

export interface INotificationStore {
    getItem<T extends Message>(key: string, messageType: { new (): T }): T | undefined
    setItem(key: string, value: Message): void
}

class LocalStorageNotificationStore implements INotificationStore {
    getItem<T extends Message>(key: string, messageType: { new (): T }): T | undefined {
        const data = localStorage.getItem(key)
        if (!data) {
            return undefined
        }
        return new messageType().fromBinary(bin_fromHexString(data))
    }

    setItem<T extends Message>(key: string, value: T): void {
        const bytes = value.toBinary()
        localStorage.setItem(key, bin_toHexString(bytes))
    }
}

export interface NotificationSettingsModel {
    fetchedAtMs: number | undefined // Date.now()
    settings: PlainMessage<GetSettingsResponse> | undefined
    error: Error | undefined
}

const emptyNotificationSettingsModel: NotificationSettingsModel = {
    fetchedAtMs: undefined,
    settings: undefined,
    error: undefined,
}

export class NotificationSettingsClient {
    public data: Observable<NotificationSettingsModel>
    private _client?: NotificationRpcClient
    private startResponseKey: string
    private finishResponseKey: string
    private settingsKey: string
    private initializePromise: Promise<NotificationRpcClient | undefined> | undefined
    private getSettingsPromise: Promise<GetSettingsResponse | undefined> | undefined

    constructor(
        private readonly signerContext: SignerContext,
        private readonly environmnetId: string,
        private readonly url: string | undefined,
        private readonly opts: RpcOptions | undefined = undefined,
        private readonly store: INotificationStore = new LocalStorageNotificationStore(),
    ) {
        const keyPrefix = `RNS-${environmnetId}-${this.userId}`
        this.startResponseKey = `${keyPrefix}-startResponse`
        this.finishResponseKey = `${keyPrefix}-finishResponse`
        this.settingsKey = `${keyPrefix}-settings`
        this.data = new Observable<NotificationSettingsModel>({
            fetchedAtMs: undefined,
            settings: this.getLocalSettings(),
            error: undefined,
        })
    }

    get userId(): string {
        return userIdFromAddress(this.signerContext.creatorAddress)
    }

    private getLocalStartResponse(): StartAuthenticationResponse | undefined {
        return this.store.getItem(this.startResponseKey, StartAuthenticationResponse)
    }

    private setLocalStartResponse(response: StartAuthenticationResponse) {
        this.store.setItem(this.startResponseKey, response)
    }

    private getLocalFinishResponse(): FinishAuthenticationResponse | undefined {
        return this.store.getItem(this.finishResponseKey, FinishAuthenticationResponse)
    }

    private setLocalFinishResponse(response: FinishAuthenticationResponse) {
        this.store.setItem(this.finishResponseKey, response)
    }

    private getLocalSettings(): GetSettingsResponse | undefined {
        return this.store.getItem(this.settingsKey, GetSettingsResponse)
    }

    private setLocalSettings(settings: GetSettingsResponse) {
        this.store.setItem(this.settingsKey, settings)
    }

    private updateLocalSettings(
        fn: (current: PlainMessage<GetSettingsResponse>) => PlainMessage<GetSettingsResponse>,
    ) {
        if (!this.data.value.settings) {
            throw new Error('TNS PUSH: settings has not been fetched')
        }
        const newSettings = fn(this.data.value.settings)
        this.setLocalSettings(new GetSettingsResponse(newSettings))
        this.data.setValue({ ...this.data.value, settings: newSettings })
    }

    private async initialize(): Promise<NotificationRpcClient | undefined> {
        if (this.initializePromise) {
            return this.initializePromise
        }
        this.initializePromise = this._initialize()
        try {
            const result = await this.initializePromise
            this.initializePromise = undefined
            return result
        } catch (error) {
            this.data.setValue({ ...this.data.value, error: error as Error })
            this.initializePromise = undefined
            return undefined
        }
    }

    private async _initialize(): Promise<NotificationRpcClient | undefined> {
        if (!this.url) {
            console.error('TNS PUSH: notification service url is unset')
            return undefined
        }
        const startResponse = this.getLocalStartResponse()
        const finishResponse = this.getLocalFinishResponse()
        if (
            startResponse &&
            finishResponse &&
            startResponse.expiration &&
            startResponse.expiration.seconds > Date.now() / 1000
        ) {
            return makeNotificationRpcClient(this.url, finishResponse.sessionToken, this.opts)
        }

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
        if (!this._client) {
            this._client = await this.initialize()
        }
        if (this._client) {
            return fn(this._client)
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
                this.data.setValue({
                    fetchedAtMs: Date.now(),
                    settings: response,
                    error: undefined,
                })
                console.log('TNS PUSH: fetched settings', response.toJson())
                this.getSettingsPromise = undefined
                return response
            } catch (error) {
                this.data.setValue({
                    ...this.data.value,
                    error: error as Error,
                })
                throw error
            }
        })
    }

    async subscribeWebPush(subscription: PlainMessage<WebPushSubscriptionObject>) {
        return this.withClient(async (client) => {
            console.log('TNS PUSH: subscribing to web push')
            return client.subscribeWebPush({ subscription })
        })
    }

    async unsubscribeWebPush(subscription: PlainMessage<WebPushSubscriptionObject>) {
        return this.withClient(async (client) => {
            console.log('TNS PUSH: unsubscribing to web push')
            return client.unsubscribeWebPush({ subscription })
        })
    }

    async setDmGlobalSetting(value: DmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmGdmSettings({
                dmGlobal: value,
                gdmGlobal:
                    this.data.value.settings?.gdmGlobal ?? GdmChannelSettingValue.GDM_UNSPECIFIED,
            })
            this.updateLocalSettings((current) => ({
                ...current,
                settings: { ...current, dmGlobal: value },
            }))
        })
    }

    async setGdmGlobalSetting(value: GdmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmGdmSettings({
                dmGlobal:
                    this.data.value.settings?.dmGlobal ?? DmChannelSettingValue.DM_UNSPECIFIED,
                gdmGlobal: value,
            })

            this.updateLocalSettings((current) => ({
                ...current,
                settings: { ...current, gdmGlobal: value },
            }))
        })
    }

    async setDmChannelSetting(channelId: string, value: DmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmChannelSetting({
                dmChannelId: streamIdAsBytes(channelId),
                value,
            })
            this.updateLocalSettings((current) => {
                const newDmChannels = current.dmChannels.filter(
                    (c) => streamIdAsString(c.channelId) !== channelId,
                )
                newDmChannels.push({ channelId: streamIdAsBytes(channelId), value })
                return {
                    ...current,
                    dmChannels: newDmChannels,
                }
            })
        })
    }
    async setGdmChannelSetting(channelId: string, value: GdmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setGdmChannelSetting({
                gdmChannelId: streamIdAsBytes(channelId),
                value,
            })
            this.updateLocalSettings((current) => {
                const newGdmChannels = current.gdmChannels.filter(
                    (c) => streamIdAsString(c.channelId) !== channelId,
                )
                newGdmChannels.push({ channelId: streamIdAsBytes(channelId), value })
                return { ...current, gdmChannels: newGdmChannels }
            })
        })
    }

    async setSpaceSetting(spaceId: string, value: SpaceChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setSpaceSettings({ spaceId: streamIdAsBytes(spaceId), value })
            this.updateLocalSettings((current) => {
                const newSpaces = [...current.space]
                const spaceIndex = newSpaces.findIndex(
                    (s) => streamIdAsString(s.spaceId) !== spaceId,
                )
                if (spaceIndex != -1) {
                    newSpaces[spaceIndex].value = value
                } else {
                    newSpaces.push({ spaceId: streamIdAsBytes(spaceId), value, channels: [] })
                }
                return { ...current, space: newSpaces }
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
            this.updateLocalSettings((current) => {
                const newSpaces = [...current.space]
                const newChannel = { channelId: streamIdAsBytes(channelId), value }
                const spaceIndex = newSpaces.findIndex(
                    (s) => streamIdAsString(s.spaceId) !== spaceId,
                )
                if (spaceIndex != -1) {
                    const newChannels = [...newSpaces[spaceIndex].channels]
                    const channelIndex = newChannels.findIndex(
                        (c) => streamIdAsString(c.channelId) === channelId,
                    )
                    if (channelIndex != -1) {
                        newChannels[channelIndex] = newChannel
                    } else {
                        newChannels.push(newChannel)
                    }
                    newSpaces[spaceIndex].channels = newChannels
                } else {
                    newSpaces.push({
                        spaceId: streamIdAsBytes(spaceId),
                        value,
                        channels: [newChannel],
                    })
                }
                return { ...current, space: newSpaces }
            })
        })
    }
}

export function useNotificationSettingsClient(
    signerContext: SignerContext | undefined,
    environmentId: string,
    url: string | undefined,
): NotificationSettingsClient | undefined {
    return useMemo(() => {
        if (!signerContext) {
            return undefined
        }
        return new NotificationSettingsClient(signerContext, environmentId, url)
    }, [environmentId, signerContext, url])
}

// safe to call from any component, as many times as needed
export function useNotificationSettings() {
    const { notificationSettingsClient: client } = useTownsContext()

    useEffect(() => {
        // fetch once if not up to date
        if (
            client &&
            (!client.data.value.fetchedAtMs ||
                client.data.value.fetchedAtMs < Date.now() - 1000 * 60 * 60 * 5)
        ) {
            void client?.getSettings()
        }
    }, [client])

    const data = useSyncExternalStore(
        (subscriber) => {
            if (!client) {
                return () => {}
            }
            return client?.data.subscribe(subscriber, { fireImediately: false })
        },
        () => client?.data.value ?? emptyNotificationSettingsModel,
    )

    const getSpaceSetting = useCallback(
        (spaceId: string): SpaceChannelSettingValue => {
            const spaceSettings = data.settings?.space.find(
                (s) => streamIdAsString(s.spaceId) === spaceId,
            )
            if (
                spaceSettings &&
                spaceSettings.value !== SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED
            ) {
                // if space is set
                return spaceSettings.value
            }
            // default
            return SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS
        },
        [data.settings?.space],
    )

    const getChannelSetting = useCallback(
        (channelId: string): SpaceChannelSettingValue => {
            const spaceId = spaceIdFromChannelId(channelId)
            const spaceSetting = data.settings?.space.find(
                (s) => streamIdAsString(s.spaceId) === spaceId,
            )
            if (spaceSetting) {
                const channelSetting = spaceSetting.channels.find(
                    (c) => streamIdAsString(c.channelId) === channelId,
                )
                // if channel is set
                if (
                    channelSetting &&
                    channelSetting.value !==
                        SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED
                ) {
                    return channelSetting.value
                }
                // if space is set
                if (
                    spaceSetting.value !==
                    SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED
                ) {
                    return spaceSetting.value
                }
            }
            // default
            return SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS
        },
        [data.settings?.space],
    )

    const getDmGlobalSetting = useCallback((): DmChannelSettingValue => {
        if (data.settings && data.settings.dmGlobal !== DmChannelSettingValue.DM_UNSPECIFIED) {
            return data.settings?.dmGlobal
        }
        return DmChannelSettingValue.DM_MESSAGES_YES
    }, [data.settings])

    const getDmSetting = useCallback(
        (channelId: string): DmChannelSettingValue => {
            const dmSetting = data.settings?.dmChannels.find(
                (c) => streamIdAsString(c.channelId) === channelId,
            )
            if (dmSetting && dmSetting.value !== DmChannelSettingValue.DM_UNSPECIFIED) {
                return dmSetting.value
            }
            return DmChannelSettingValue.DM_MESSAGES_YES
        },
        [data.settings?.dmChannels],
    )

    const getGdmGlobalSetting = useCallback((): GdmChannelSettingValue => {
        if (data.settings && data.settings.gdmGlobal !== GdmChannelSettingValue.GDM_UNSPECIFIED) {
            return data.settings?.gdmGlobal
        }
        return GdmChannelSettingValue.GDM_MESSAGES_ALL
    }, [data.settings])

    const getGdmSetting = useCallback(
        (channelId: string): GdmChannelSettingValue => {
            const gdmSetting = data.settings?.gdmChannels.find(
                (c) => streamIdAsString(c.channelId) === channelId,
            )
            if (gdmSetting && gdmSetting.value !== GdmChannelSettingValue.GDM_UNSPECIFIED) {
                return gdmSetting.value
            }
            return GdmChannelSettingValue.GDM_MESSAGES_ALL
        },
        [data.settings?.gdmChannels],
    )

    return {
        isLoading: !data.fetchedAtMs,
        error: data.error,
        notificationSettingsClient: client,
        settings: data.settings,
        getSpaceSetting,
        getChannelSetting,
        getDmSetting,
        getDmGlobalSetting,
        getGdmSetting,
        getGdmGlobalSetting,
    }
}

export function useMutedStreamIds() {
    const { settings } = useNotificationSettings()
    return useMemo(() => {
        return getMutedChannelIds(settings) ?? new Set<string>()
    }, [settings])
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

export function useMuteSettings({
    spaceId,
    channelId,
}: {
    spaceId: string | undefined
    channelId?: string
}) {
    const { getChannelSetting, getSpaceSetting } = useNotificationSettings()
    return useMemo(
        () => ({
            channelIsMuted: channelId
                ? getChannelSetting(channelId) ===
                  SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
                : false,
            spaceIsMuted: spaceId
                ? getSpaceSetting(spaceId) ===
                  SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
                : false,
        }),
        [spaceId, channelId, getChannelSetting, getSpaceSetting],
    )
}
