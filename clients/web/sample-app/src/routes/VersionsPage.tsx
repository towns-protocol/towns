import { Stack } from '@mui/material'
import React from 'react'
import { useServerVersions, useZionContext } from 'use-zion-client'

export const VersionsPage = () => {
    const { casablancaServerUrl } = useZionContext()

    const { isFetched, isSuccess, isError, serverVersions } = useServerVersions({
        homeserverUrl: undefined,
    })

    return (
        <VersionsPageLayout>
            <div data-testid="casablancaUrl">{`casablancaUrl: ${casablancaServerUrl}`}</div>
            <div data-testid="appVersion">{`appVersion: ${APP_VERSION}`}</div>
            <div data-testid="isFetched">{`isFetched: ${JSON.stringify(isFetched)}`}</div>
            <div data-testid="isSuccess">{`isSuccess: ${JSON.stringify(isSuccess)}`}</div>
            <div data-testid="isError">{`isError: ${JSON.stringify(isError)}`}</div>
            <div data-testid="release_version">{`release_version: ${JSON.stringify(
                serverVersions,
            )}`}</div>
        </VersionsPageLayout>
    )
}

/**
 * Structure shared between home and loading to keep logo position consistent
 */
export const VersionsPageLayout = (props: { children?: React.ReactNode }) => (
    <Stack>{props.children}</Stack>
)
