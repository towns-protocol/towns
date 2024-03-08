import { useCasablancaCredentials, useTownsClient } from 'use-towns-client'

import { Button } from '@mui/material'
import React, { useCallback } from 'react'

export function Logout(): JSX.Element | null {
    const { isAuthenticated } = useCasablancaCredentials()
    const { logout } = useTownsClient()

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
