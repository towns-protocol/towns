import { useZionContext } from '../components/ZionContextProvider'
import { UserEvent } from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { MyProfile } from '../types/matrix-types'

export function useMyProfile(): MyProfile | undefined {
    const { client } = useZionContext()
    // const { myProfile } = useMatrixStore();
    const userId = client?.getUserId()
    const user = userId ? client?.getUser(userId) : undefined
    const [myProfile, setMyProfile] = useState<MyProfile>()

    useEffect(() => {
        // preconditions
        if (!user) {
            setMyProfile(undefined)
            return
        }
        // helpers
        const updateProfile = () => {
            setMyProfile({
                userId: user.userId,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
            })
        }
        // initial state
        updateProfile()
        // event listeners
        user.on(UserEvent.DisplayName, updateProfile)
        user.on(UserEvent.AvatarUrl, updateProfile)
        return () => {
            user.off(UserEvent.DisplayName, updateProfile)
            user.off(UserEvent.AvatarUrl, updateProfile)
        }
    }, [user])

    return myProfile
}
