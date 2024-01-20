import { Stack } from '@mui/material'
import React from 'react'
import { useCasablancaCredentials, useMyProfile } from 'use-zion-client'
import { Logout } from './Logout'

export const Me = () => {
    const myProfile = useMyProfile()
    const { userId } = useCasablancaCredentials()

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
                Username: <strong>{myProfile?.username}</strong>
            </p>
            <Logout />
        </Stack>
    )
}
