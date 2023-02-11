import React, { useMemo } from 'react'
import {
    createUserIdFromString,
    useMatrixCredentials,
    useMyProfile,
    useServerVersions,
} from 'use-zion-client'
import { UserProfile } from '@components/UserProfile/UserProfile'
import { Panel } from '@ui'
import { Stack } from 'ui/components/Stack/Stack'
import { useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'

export const MeIndex = () => {
    const { isAuthenticated, username, userId } = useMatrixCredentials()
    const myProfile = useMyProfile()
    const { homeserverUrl } = useMatrixHomeServerUrl()

    const { serverVersions } = useServerVersions({ homeserverUrl })

    const isValid = !!myProfile
    const userAddress = isValid
        ? createUserIdFromString(myProfile.userId)?.accountAddress
        : undefined
    const info = useMemo(
        () => [
            {
                title: `User ID`,
                content: userId ?? `??`,
            },
            {
                title: `Username`,
                content: username ?? `??`,
            },
            {
                title: `Authenticated`,
                content: isAuthenticated ? `yes` : `no`,
            },
            {
                title: `Server version`,
                content: serverVersions ?? `??`,
            },
        ],
        [isAuthenticated, serverVersions, userId, username],
    )

    return (
        <Panel label="Profile" paddingX="lg">
            <Stack paddingX="sm" gap="lg" width="600">
                {myProfile ? (
                    <UserProfile
                        displayName={myProfile.displayName}
                        avatarUrl={myProfile.avatarUrl}
                        userAddress={userAddress}
                        info={info}
                    />
                ) : (
                    <>profile not found</>
                )}
            </Stack>
        </Panel>
    )
}
