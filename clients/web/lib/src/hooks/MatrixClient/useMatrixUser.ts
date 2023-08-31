import { MatrixEvent, UserEvent, User as MatrixUser, MatrixClient } from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { toZionUser } from '../../store/use-matrix-store'
import { User } from '../../types/zion-types'

export function useMatrixUser(userId?: string, matrixClient?: MatrixClient): User | undefined {
    const [user, setUser] = useState<User | undefined>(() => {
        if (userId) {
            const matrixUser = matrixClient?.getUser(userId)
            return matrixUser ? toZionUser(matrixUser) : undefined
        }
        return undefined
    })

    useEffect(() => {
        if (!userId) {
            return
        }
        const matrixUser = matrixClient?.getUser(userId)
        if (!matrixUser) {
            return
        }

        // discard warnings about max listeners (10)
        matrixUser.setMaxListeners(100)

        const onUserUpdated = (event: MatrixEvent | undefined, theUser: MatrixUser) => {
            setUser(toZionUser(theUser))
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
    }, [matrixClient, userId])

    return user
}
