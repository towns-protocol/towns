import React from 'react'

import { useServerVersions } from 'use-zion-client'
import { Box } from '@ui'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const VersionsPage = () => {
    const { isFetched, isSuccess, isError, serverVersions } = useServerVersions({
        homeserverUrl: undefined,
    })

    return (
        <WelcomeLayout>
            <Box grow horizontal elevateReadability width="600" borderRadius="sm">
                <Box
                    padding
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                    fontSize="sm"
                >
                    <div data-testid="isFetched">{`isFetched: ${JSON.stringify(isFetched)}`}</div>
                    <div data-testid="isSuccess">{`isSuccess: ${JSON.stringify(isSuccess)}`}</div>
                    <div data-testid="isError">{`isError: ${JSON.stringify(isError)}`}</div>
                    <div data-testid="release_version">{`release_version: ${JSON.stringify(
                        serverVersions,
                        null,
                        2,
                    )}`}</div>
                </Box>
            </Box>
        </WelcomeLayout>
    )
}

export default VersionsPage
