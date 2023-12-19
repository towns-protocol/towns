import { useZionContext } from 'use-zion-client'
import { useEffect, useState } from 'react'

export const useUserInfo = (streamId?: string, userId?: string) => {
    const { casablancaClient } = useZionContext()

    const [user, setUser] = useState<
        { username: string; displayName: string; displayNameEncrypted: boolean } | undefined
    >(undefined)
    useEffect(() => {
        if (!streamId || !userId) {
            return
        }
        const stream = casablancaClient?.streams.get(streamId)
        if (!stream) {
            return
        }

        const userInfoUpdated = (updatedStreamId: string, updatedUserId: string) => {
            if (updatedStreamId !== streamId || updatedUserId !== userId) {
                return
            }
            const info = stream.view.getUserMetadata()?.userInfo(userId)
            setUser(info)
        }
        userInfoUpdated(streamId, userId)
        stream.on('streamDisplayNameUpdated', userInfoUpdated)
        stream.on('streamUsernameUpdated', userInfoUpdated)
        stream.on('streamPendingDisplayNameUpdated', userInfoUpdated)
        stream.on('streamPendingUsernameUpdated', userInfoUpdated)
        return () => {
            stream.off('streamDisplayNameUpdated', userInfoUpdated)
            stream.off('streamUsernameUpdated', userInfoUpdated)
            stream.off('streamPendingDisplayNameUpdated', userInfoUpdated)
            stream.off('streamPendingUsernameUpdated', userInfoUpdated)
        }
    }, [casablancaClient, userId, setUser, streamId])
    return { user }
}
