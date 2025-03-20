import { useEffect, useState } from 'react'
import {
    Client as CasablancaClient,
    Stream,
    isDefined,
    userIdFromAddress,
} from '@towns-protocol/sdk'
import { check } from '@towns-protocol/dlog'
import { UserSettingsPayload_UserBlock } from '@towns-protocol/proto'

export function useBlockedUsers(casablancaClient?: CasablancaClient) {
    const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set<string>())

    useEffect(() => {
        if (!casablancaClient || !casablancaClient.userId) {
            return
        }

        const initBlockedUsers = (stream: Stream) => {
            const userSettingsContent = stream.view.userSettingsContent
            const newBlockedUserIds = new Set<string>()
            Object.keys(userSettingsContent.userBlocks).forEach((key) => {
                if (userSettingsContent.isUserBlocked(key)) {
                    newBlockedUserIds.add(key)
                }
            })

            setBlockedUserIds(newBlockedUserIds)
        }

        const onStreamInitialized = (streamId: string) => {
            if (streamId !== casablancaClient.userSettingsStreamId) {
                return
            }
            const stream = casablancaClient.stream(casablancaClient.userSettingsStreamId)
            check(isDefined(stream), 'stream must be defined')
            if (stream && stream.view.isInitialized) {
                initBlockedUsers(stream)
            }
        }

        const onUserBlockUpdated = (userBlock: UserSettingsPayload_UserBlock) => {
            setBlockedUserIds((prevBlockedUserIds) => {
                const newBlockedUserIds = new Set(prevBlockedUserIds)
                const userId = userIdFromAddress(userBlock.userId)
                if (userBlock.isBlocked) {
                    newBlockedUserIds.add(userId)
                } else {
                    newBlockedUserIds.delete(userId)
                }
                return newBlockedUserIds
            })
        }

        if (casablancaClient.userSettingsStreamId) {
            const stream = casablancaClient.stream(casablancaClient.userSettingsStreamId)
            if (stream && stream.view.isInitialized) {
                initBlockedUsers(stream)
            }
        }

        casablancaClient.on('userBlockUpdated', onUserBlockUpdated)
        casablancaClient.on('streamInitialized', onStreamInitialized)

        return () => {
            casablancaClient.off('userBlockUpdated', onUserBlockUpdated)
            casablancaClient.off('streamInitialized', onStreamInitialized)
        }
    }, [casablancaClient])

    useEffect(() => {
        console.log(`useBlockedUsers blockedUserIds`, { blockedUserIds })
    }, [blockedUserIds])

    return blockedUserIds
}
