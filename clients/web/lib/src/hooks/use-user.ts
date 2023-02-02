import { MatrixEvent, UserEvent, User as MatrixUser } from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { User } from '../types/zion-types'

export function useUser(userId?: string): User | undefined {
    const { client } = useZionContext()
    const [user, setUser] = useState<User>()

    useEffect(() => {
        if (!userId) {
            return
        }
        const matrixUser = client?.getUser(userId)
        if (!matrixUser) {
            return
        }

        const onUserUpdated = (event: MatrixEvent | undefined, theUser: MatrixUser) => {
            setUser({
                userId: theUser.userId,
                displayName: theUser.displayName ?? 'Unknown',
                avatarUrl: theUser.avatarUrl,
                presence: theUser.presence,
                lastPresenceTs: theUser.lastPresenceTs,
                currentlyActive: theUser.currentlyActive,
            })
        }

        onUserUpdated(undefined, matrixUser)

        matrixUser.on(UserEvent.DisplayName, onUserUpdated)
        matrixUser.on(UserEvent.AvatarUrl, onUserUpdated)
        matrixUser.on(UserEvent.Presence, onUserUpdated)
        matrixUser.on(UserEvent.CurrentlyActive, onUserUpdated)
        matrixUser.on(UserEvent.LastPresenceTs, onUserUpdated)

        return () => {
            matrixUser.off(UserEvent.DisplayName, onUserUpdated)
            matrixUser.off(UserEvent.AvatarUrl, onUserUpdated)
            matrixUser.off(UserEvent.Presence, onUserUpdated)
            matrixUser.off(UserEvent.CurrentlyActive, onUserUpdated)
            matrixUser.off(UserEvent.LastPresenceTs, onUserUpdated)
            setUser(undefined)
        }
    }, [client, userId])

    return user
}
