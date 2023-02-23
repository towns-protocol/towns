import React, { useEffect } from 'react'
import { FallbackProps } from 'react-error-boundary'
import { TransitionLogo } from '@components/Logo/Logo'
import { Stack, Text } from '@ui'

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

export function AppErrorFallback({ error }: FallbackProps) {
    const isDynamicImportError = error.message
        .toLowerCase()
        .includes('failed to fetch dynamically imported module')

    useEffect(() => {
        if (isDynamicImportError) {
            if (!getWithExpiry('isDynamicImportError')) {
                setWithExpiry('isDynamicImportError', 'true', 1000 * 60 * 3)
                window.location.reload()
            }
        }
    }, [isDynamicImportError])

    return (
        <Stack centerContent gap="lg" height="100vh">
            <TransitionLogo />
            <Text size="lg">
                We&apos;re sorry, we&apos;re having some techincal issues right now.
            </Text>
            <Text size="lg">Please try again later.</Text>
        </Stack>
    )
}
