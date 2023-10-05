import { Stack } from '@mui/material'
import React, { useMemo } from 'react'
import {
    createUserIdFromString,
    useMatrixCredentials,
    useMyProfile,
    useServerVersions,
} from 'use-zion-client'

export const Me = () => {
    const { userId } = useMatrixCredentials()
    const myProfile = useMyProfile()

    const { serverVersions } = useServerVersions({ homeserverUrl: undefined })
    const userIdentifier = useMemo(() => {
        return userId ? createUserIdFromString(userId) : undefined
    }, [userId])

    return (
        <Stack>
            <p>
                My Display Name: <strong>{myProfile?.displayName ?? 'unset'}</strong>
            </p>
            <p>
                My Avatar Url: <strong>{myProfile?.avatarUrl ?? 'unset'}</strong>
            </p>
            <p>
                My User ID: <strong>{userId}</strong>
            </p>
            <p>
                Matrix ID Localpart: <strong>{userIdentifier?.matrixUserIdLocalpart}</strong>
            </p>
            <p>
                Wallet Address: <strong>{userIdentifier?.accountAddress}</strong>
            </p>
            <p>
                Chain Agnostic ID: <strong>{userIdentifier?.chainAgnosticId}</strong>
            </p>
            <p>
                Chain ID: <strong>{userIdentifier?.chainId}</strong>
            </p>
            <p>
                Release Version: <strong>{serverVersions?.release_version ?? '??'}</strong>
            </p>
        </Stack>
    )
}
