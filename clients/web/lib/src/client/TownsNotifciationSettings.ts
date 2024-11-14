import { bin_fromHexString, bin_toHexString } from '@river-build/dlog'
import {
    DmChannelSettingValue,
    FinishAuthenticationResponse,
    GdmChannelSettingValue,
    GetSettingsRequest,
    GetSettingsResponse,
    SpaceChannelSettingValue,
    StartAuthenticationResponse,
    SubscribeWebPushRequest,
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
} from '@river-build/sdk'
import { Message, PlainMessage } from '@bufbuild/protobuf'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'

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
    settings: GetSettingsResponse | undefined
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

    private async initialize(): Promise<NotificationRpcClient | undefined> {
        if (this.initializePromise) {
            return this.initializePromise
        }
        this.initializePromise = this._initialize()
        return this.initializePromise
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
        this.initializePromise = undefined
        return service.notificationRpcClient
    }

    async client(): Promise<NotificationRpcClient | undefined> {
        if (!this._client) {
            this._client = await this.initialize()
        }
        return this._client
    }

    async getSettings(): Promise<GetSettingsResponse | undefined> {
        if (this.getSettingsPromise) {
            return this.getSettingsPromise
        }
        this.getSettingsPromise = this._getSettings()
        return this.getSettingsPromise
    }

    private async _getSettings(): Promise<GetSettingsResponse | undefined> {
        const client = await this.client()
        if (!client) {
            return undefined
        }
        const response = await client.getSettings(new GetSettingsRequest())
        this.setLocalSettings(response)
        this.data.setValue({ fetchedAtMs: Date.now(), settings: response })
        this.getSettingsPromise = undefined
        return response
    }

    async subscribeWebPush(subscription: PlainMessage<WebPushSubscriptionObject>) {
        console.log('TNS PUSH: subscribeWebPush begin')
        const client = await this.client()
        if (!client) {
            return
        }
        console.log('TNS PUSH: subscribing to web push')
        return client.subscribeWebPush(new SubscribeWebPushRequest({ subscription }))
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
    const { notificationSettingsClient } = useTownsContext()
    const observable = useMemo(
        () =>
            notificationSettingsClient?.data ??
            new Observable<NotificationSettingsModel>({
                fetchedAtMs: undefined,
                settings: undefined,
            }),
        [notificationSettingsClient],
    )

    useEffect(() => {
        // fetch once if not up to date
        if (
            notificationSettingsClient &&
            (!notificationSettingsClient.data.value.fetchedAtMs ||
                notificationSettingsClient.data.value.fetchedAtMs < Date.now() - 1000 * 60 * 60 * 5)
        ) {
            void notificationSettingsClient?.getSettings()
        }
    }, [notificationSettingsClient])

    const settings = useSyncExternalStore(
        (subscriber) => observable?.subscribe(subscriber, { fireImediately: false }),
        () => observable?.value,
    )

    return settings.settings
}

export function useMutedStreamIds() {
    const settings = useNotificationSettings()
    return useMemo(() => {
        const ids = new Set<string>()
        if (!settings) {
            return ids
        }
        for (const spaceSetting of settings.space) {
            if (
                spaceSetting.value ===
                SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
            ) {
                ids.add(bin_toHexString(spaceSetting.spaceId))
            }
            for (const channelSetting of spaceSetting.channels) {
                if (
                    channelSetting.value ===
                    SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_NO_MESSAGES_AND_MUTE
                ) {
                    ids.add(bin_toHexString(channelSetting.channelId))
                }
            }
        }
        for (const dmSetting of settings.dmChannels) {
            if (dmSetting.value === DmChannelSettingValue.DM_MESSAGES_NO_AND_MUTE) {
                ids.add(bin_toHexString(dmSetting.channelId))
            }
        }
        for (const gdmSetting of settings.gdmChannels) {
            if (gdmSetting.value === GdmChannelSettingValue.GDM_MESSAGES_NO_AND_MUTE) {
                ids.add(bin_toHexString(gdmSetting.channelId))
            }
        }
        return ids
    }, [settings])
}
