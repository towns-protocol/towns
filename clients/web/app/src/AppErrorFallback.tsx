import React, { useEffect } from 'react'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'

function setWithExpiry(key: string, value: string, ttl: number) {
    const item = {
        value: value,
        expiry: new Date().getTime() + ttl,
    }
    localStorage.setItem(key, JSON.stringify(item))
}

function getWithExpiry(key: string) {
    const itemString = window.localStorage.getItem(key)
    if (!itemString) {
        return null
    }

    const item = JSON.parse(itemString)
    const isExpired = new Date().getTime() > item.expiry

    if (isExpired) {
        localStorage.removeItem(key)
        return null
    }

    return item.value
}

type FallbackRender = {
    error: Error
}

export function AppErrorFallback({ error }: FallbackRender) {
    const isDynamicImportError = error.message
        .toLowerCase()
        .includes('failed to fetch dynamically imported module')

    useEffect(() => {
        if (isDynamicImportError) {
            if (!getWithExpiry('isDynamicImportError')) {
                setWithExpiry('isDynamicImportError', 'true', 1000 * 60 * 3)
                console.warn('AppErrorFallback: isDynamicImportError, reloading...')
                window.location.reload()
            }
        }
    }, [isDynamicImportError])

    return (
        <WelcomeLayout>
            <Box />
            <Box
                horizontal
                border
                background="level2"
                color="gray1"
                padding="lg"
                rounded="sm"
                gap="md"
            >
                <Stack debug justifyContent="start">
                    <Icon type="alert" />
                </Stack>
                <Stack>
                    <Paragraph>
                        We&apos;re sorry, we&apos;re having some technical issues right now.
                    </Paragraph>
                    <Paragraph>Please try again later.</Paragraph>
                </Stack>
            </Box>
        </WelcomeLayout>
    )
}
