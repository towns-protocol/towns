import {
    DmChannelSettingValue,
    FinishAuthenticationResponse,
    GdmChannelSettingValue,
    GetSettingsResponse,
    SpaceChannelSettingValue,
    StartAuthenticationResponse,
    WebPushSubscriptionObject,
    PlainMessage,
    StartAuthenticationResponseSchema,
    FinishAuthenticationResponseSchema,
    GetSettingsResponseSchema,
    DmChannelSettingSchema,
    GdmChannelSettingSchema,
    SpaceSettingSchema,
    SpaceChannelSettingSchema,
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
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river-build/sdk'
import { create, DescMessage, fromBinary, MessageShape, toBinary, toJson } from '@bufbuild/protobuf'
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { bin_fromBase64, bin_toBase64 } from '@river-build/dlog'
import cloneDeep from 'lodash/cloneDeep'

export interface INotificationStore {
    getItem<Desc extends DescMessage>(schema: Desc, key: string): MessageShape<Desc> | undefined
    setItem<Desc extends DescMessage>(schema: Desc, key: string, value: MessageShape<Desc>): void
}

class LocalStorageNotificationStore implements INotificationStore {
    getItem<Desc extends DescMessage>(schema: Desc, key: string): MessageShape<Desc> | undefined {
        const data = localStorage.getItem(key)
        if (!data) {
            return undefined
        }
        try {
            return fromBinary(schema, bin_fromBase64(data))
        } catch (error) {
            console.error('TNS PUSH: error parsing local storage', error)
            return undefined
        }
    }

    setItem<Desc extends DescMessage>(schema: Desc, key: string, value: MessageShape<Desc>): void {
        const bytes = toBinary(schema, value)
        localStorage.setItem(key, bin_toBase64(bytes))
    }
}

export interface NotificationSettingsModel {
    fetchedAtMs: number | undefined // Date.now()
    settings: GetSettingsResponse | undefined
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
    private getClientPromise: Promise<NotificationRpcClient | undefined> | undefined
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
        return this.store.getItem(StartAuthenticationResponseSchema, this.startResponseKey)
    }

    private setLocalStartResponse(response: StartAuthenticationResponse) {
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
        if (!this.data.value.settings) {
            throw new Error('TNS PUSH: settings has not been fetched')
        }
        const newSettings = cloneDeep(this.data.value.settings) // aellis we probably don't need a clone deep
        fn(newSettings)
        this.setLocalSettings(newSettings)
        this.data.setValue({ ...this.data.value, settings: newSettings })
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
            this.data.setValue({ ...this.data.value, error: error as Error })
            this.getClientPromise = undefined
            return undefined
        }
    }

    private async _getClient(): Promise<NotificationRpcClient | undefined> {
        if (!this.url) {
            throw new Error('TNS PUSH: notification service url is unset')
        }
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
                console.error(
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
                this.data.setValue({ ...this.data.value, error: error as Error })
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
                this.data.setValue({
                    fetchedAtMs: Date.now(),
                    settings: response,
                    error: undefined,
                })
                console.log(
                    'TNS PUSH: fetched settings',
                    toJson(GetSettingsResponseSchema, response),
                )
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
            this.updateLocalSettings((settings) => {
                settings.dmGlobal = value
            })
        })
    }

    async setGdmGlobalSetting(value: GdmChannelSettingValue) {
        return this.withClient(async (client) => {
            await client.setDmGdmSettings({
                dmGlobal:
                    this.data.value.settings?.dmGlobal ?? DmChannelSettingValue.DM_UNSPECIFIED,
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

    const getRawChannelSetting = useCallback(
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
                if (channelSetting) {
                    return channelSetting.value
                }
            }
            return SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED
        },
        [data.settings],
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
            // global
            if (data.settings && data.settings?.dmGlobal !== DmChannelSettingValue.DM_UNSPECIFIED) {
                return data.settings.dmGlobal
            }
            // default
            return DmChannelSettingValue.DM_MESSAGES_YES
        },
        [data.settings],
    )
    const getRawDmSetting = useCallback(
        (channelId: string): DmChannelSettingValue => {
            const dmSetting = data.settings?.dmChannels.find(
                (c) => streamIdAsString(c.channelId) === channelId,
            )
            return dmSetting?.value ?? DmChannelSettingValue.DM_UNSPECIFIED
        },
        [data.settings],
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
            // global
            if (
                data.settings &&
                data.settings.gdmGlobal !== GdmChannelSettingValue.GDM_UNSPECIFIED
            ) {
                return data.settings.gdmGlobal
            }
            // default
            return GdmChannelSettingValue.GDM_MESSAGES_ALL
        },
        [data.settings],
    )
    const getRawGdmSetting = useCallback(
        (channelId: string): GdmChannelSettingValue => {
            const gdmSetting = data.settings?.gdmChannels.find(
                (c) => streamIdAsString(c.channelId) === channelId,
            )
            return gdmSetting?.value ?? GdmChannelSettingValue.GDM_UNSPECIFIED
        },
        [data.settings],
    )

    return {
        isLoading: !data.fetchedAtMs,
        error: data.error,
        notificationSettingsClient: client,
        settings: data.settings,
        getSpaceSetting,
        getChannelSetting,
        getRawChannelSetting,
        getDmSetting,
        getRawDmSetting,
        getGdmSetting,
        getRawGdmSetting,
        getDmGlobalSetting,
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
    const { getChannelSetting, getSpaceSetting, getDmSetting, getGdmSetting } =
        useNotificationSettings()
    return useMemo(() => {
        try {
            if (channelId && isDMChannelStreamId(channelId)) {
                return {
                    channelIsMuted:
                        getDmSetting(channelId) === DmChannelSettingValue.DM_MESSAGES_NO_AND_MUTE,
                    spaceIsMuted: false,
                }
            } else if (channelId && isGDMChannelStreamId(channelId)) {
                return {
                    channelIsMuted:
                        getGdmSetting(channelId) ===
                        GdmChannelSettingValue.GDM_MESSAGES_NO_AND_MUTE,
                    spaceIsMuted: false,
                }
            }
            return {
                channelIsMuted: channelId
                    ? getChannelSetting(channelId) ===
                      SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
                    : false,
                spaceIsMuted: spaceId
                    ? getSpaceSetting(spaceId) ===
                      SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
                    : false,
            }
        } catch (error) {
            return {
                channelIsMuted: false,
                spaceIsMuted: false,
            }
        }
    }, [channelId, getChannelSetting, spaceId, getSpaceSetting, getDmSetting, getGdmSetting])
}
