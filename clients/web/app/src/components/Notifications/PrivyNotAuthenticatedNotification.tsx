import React, { useCallback, useState } from 'react'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { sleep } from 'use-zion-client'
import { Box, Button, Icon, IconButton, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

export const PrivyNotAuthenticatedNotification = ({ toast }: { toast: Toast }) => {
    const { login, logout } = useAuth()
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [isLogoutError, setIsLogoutError] = useState(false)

    const reauthenticate = useCallback(async () => {
        if (isTransitioning) {
            return
        }
        setIsTransitioning(true)
        setIsLogoutError(false)
        try {
            await logout()
        } catch (error) {
            console.error('[PrivyNotAuthenticatedNotification]', error)
            setIsLogoutError(true)
            setIsTransitioning(false)
            return
        }
        // toast dismisses, don't need to update state
        headlessToast.dismiss(toast.id)
        // this should be fine otherwise we need to implement a waitFor for river login status
        await sleep(200)
        await login()
    }, [isTransitioning, login, logout, toast.id])

    return (
        <Box gap width="350">
            <Box horizontal gap>
                <Icon color="error" type="alert" />
                <Box gap>
                    <Text size="sm">{`For your security, before performing this on-chain transaction, we need to re-authenticate you.`}</Text>
                    <Button disabled={isTransitioning} size="button_sm" onClick={reauthenticate}>
                        {isTransitioning ? <ButtonSpinner /> : 'Proceed'}
                    </Button>
                    {isLogoutError && (
                        <Text size="sm" color="error">
                            There was an error logging out, please try again.
                        </Text>
                    )}
                </Box>
                <IconButton
                    alignSelf="start"
                    size="square_xs"
                    icon="close"
                    border="level4"
                    rounded="full"
                    disabled={isTransitioning}
                    onClick={() => headlessToast.dismiss(toast.id)}
                />
            </Box>
        </Box>
    )
}
