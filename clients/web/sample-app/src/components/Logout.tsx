import { useCasablancaCredentials, useZionClient } from 'use-zion-client'

import { Button } from '@mui/material'
import React, { useCallback } from 'react'

export function Logout(): JSX.Element | null {
    const { isAuthenticated } = useCasablancaCredentials()
    const { logout } = useZionClient()

    const onLogout = useCallback(
        async function () {
            await logout()
        },
        [logout],
    )

    return isAuthenticated ? (
        <Button color="primary" variant="contained" onClick={onLogout}>
            Logout
        </Button>
    ) : null
}
