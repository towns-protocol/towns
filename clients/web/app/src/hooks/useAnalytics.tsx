import React, { createContext, useCallback, useEffect, useState } from 'react'
import * as amplitudeLib from '@amplitude/analytics-browser'
import {
    CreateSpaceInfo,
    MessageType,
    RoomIdentifier,
    SendMessageOptions,
    useZionClient,
} from 'use-zion-client'
import { env } from '../utils/environment'

interface Analytics {
    // this function is a wrapper around amplitude's track function.
    // it has the same arguments, but it returns an unknown type.
    // we never want to depend on the return type of the amplitude track function
    // inside our application layer. we just want to fire and forget.
    track: (...args: Parameters<typeof amplitudeLib['track']>) => unknown
}

const UNITITIALIZED_ANALYTICS: Analytics = {
    track: (...args) => {
        console.debug(
            'Analytics not initialized, but track was called with the following arguments:',
        )
        args.forEach(console.debug)
    },
}

const AnalyticsContext = createContext<Analytics>(UNITITIALIZED_ANALYTICS)

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
    const [analytics, setAnalytics] = useState<Analytics>(UNITITIALIZED_ANALYTICS)

    useEffect(() => {
        if (env.VITE_AMPLITUDE_KEY) {
            amplitudeLib.init(env.VITE_AMPLITUDE_KEY, undefined, {
                appVersion: APP_VERSION,
            })
            setAnalytics(amplitudeLib)
            console.debug('Amplitude key found. Initializing analytics.')
        } else {
            console.debug('Amplitude key not found. Skipping analytics initialization.')
        }
    }, [])

    const onCreateSpace = useCallback(
        (roomIdentifier: RoomIdentifier) => {
            analytics.track('create_space', {
                protocol: roomIdentifier.protocol,
                slug: roomIdentifier.slug,
                networkId: roomIdentifier.networkId,
            })
        },
        [analytics],
    )

    const onInviteUser = useCallback(
        (roomId: RoomIdentifier, userId: string) => {
            analytics.track('invite_user', {
                invitedUserId: userId,
                protocol: roomId.protocol,
                slug: roomId.slug,
                networkId: roomId.networkId,
            })
        },
        [analytics],
    )

    const onJoinRoom = useCallback(
        (roomId: RoomIdentifier) => {
            analytics.track('join_room', {
                protocol: roomId.protocol,
                slug: roomId.slug,
                networkId: roomId.networkId,
            })
        },
        [analytics],
    )

    const onSendMessage = useCallback(
        (roomId: RoomIdentifier, sendMessageOptions?: SendMessageOptions) => {
            const isURL =
                sendMessageOptions?.messageType == MessageType.ZionText &&
                sendMessageOptions.attachments?.some(
                    (attachment) => typeof attachment.url == 'string',
                )
            analytics.track('send_message', {
                protocol: roomId.protocol,
                slug: roomId.slug,
                networkId: roomId.networkId,
                messageType: sendMessageOptions?.messageType,
                isInThread: !!sendMessageOptions?.threadId,
                isURL,
            })
        },
        [analytics],
    )

    const onLogin = useCallback(({ userId }: { userId: string }) => {
        const identifyObj = new amplitudeLib.Identify()
        amplitudeLib.identify(identifyObj, {
            user_id: userId,
        })
    }, [])

    const onLogout = useCallback(() => {
        amplitudeLib.reset()
    }, [])

    const { client } = useZionClient()

    useEffect(() => {
        client?.setEventHandlers({
            onCreateSpace,
            onInviteUser,
            onJoinRoom,
            onSendMessage,
            onLogin,
            onLogout,
        })
    }, [onCreateSpace, onInviteUser, onJoinRoom, onSendMessage, client, onLogin, onLogout])

    return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>
}
