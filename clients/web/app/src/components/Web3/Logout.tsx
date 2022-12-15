import React from 'react'
import { Button } from '@ui'
import { useAuth } from 'hooks/useAuth'

export const Logout = () => {
    const { logout, isAuthenticated } = useAuth()

    return isAuthenticated ? <Button onClick={logout}>Logout</Button> : null
}
