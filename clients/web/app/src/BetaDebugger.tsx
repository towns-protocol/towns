import React, { useState } from 'react'
import { useNetworkStatus, useTownsContext } from 'use-towns-client'
import { Box, Button, Paragraph, Stack, Text, TextButton } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'

export function BetaDebugger() {
    const [isVisible, setIsVisible] = useState(false)
    const show = () => setIsVisible(true)
    const hide = () => setIsVisible(false)
    const { errorMessage, clearSiteData } = useClearSiteData()
    const { clientStatus } = useTownsContext()
    const { isOffline } = useNetworkStatus()

    return (
        <>
            <Box gap alignItems="start">
                <Stack horizontal gap="sm" justifyContent="center">
                    <Box
                        width="x1"
                        height="x1"
                        rounded="full"
                        background={clientStatus.streamSyncActive && !isOffline ? 'cta1' : 'error'}
                    />
                    <Text
                        color={clientStatus.streamSyncActive && !isOffline ? 'cta1' : 'error'}
                        fontSize="sm"
                    >
                        {clientStatus.streamSyncActive && !isOffline
                            ? 'Sync active'
                            : 'Sync Offline'}
                    </Text>
                </Stack>

                <Stack horizontal gap="xs" color="gray1" fontSize="sm" alignItems="center">
                    <Paragraph size="sm">App Version:</Paragraph>
                    <ClipboardCopy clipboardContent={APP_COMMIT_HASH} label={APP_COMMIT_HASH} />
                </Stack>
                <Box padding="sm">
                    <TextButton tone="level3" color="negative" onClick={show}>
                        <Paragraph size="sm">Reset Caches</Paragraph>
                    </TextButton>
                </Box>
            </Box>

            {isVisible && (
                <ModalContainer minWidth="auto" onHide={hide}>
                    <Box padding="sm" gap="lg" alignItems="center">
                        <Text>Are you sure you want to clear all local data?</Text>
                        <Box horizontal gap>
                            <Button tone="level2" onClick={hide}>
                                Cancel
                            </Button>
                            <Button tone="negative" onClick={clearSiteData}>
                                Confirm
                            </Button>
                        </Box>
                        {errorMessage && <Text color="error">{errorMessage}</Text>}
                    </Box>
                </ModalContainer>
            )}
        </>
    )
}

function useClearSiteData() {
    const [errorMessage, setErrorMessage] = useState<string | undefined>()

    async function clearSiteData() {
        let _errorMessage = ''
        window.localStorage.clear()
        window.sessionStorage.clear()

        try {
            const dbs = await indexedDB.databases()
            dbs.forEach((db) => {
                const name = db.name
                if (name) {
                    const deleteRequest = indexedDB.deleteDatabase(name)
                    deleteRequest.onerror = function () {
                        _errorMessage =
                            _errorMessage + '::Error clearing IndexedDB database::' + name
                    }
                }
            })
        } catch (error) {
            _errorMessage = _errorMessage + '::Error grabbing IndexedDB databases::'
        }

        // Clear service workers
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
            try {
                registration.unregister()
            } catch (error) {
                _errorMessage = _errorMessage + '::Error unregistering service worker::'
            }
        }

        if (_errorMessage) {
            setErrorMessage(_errorMessage)
        } else {
            window.location.reload()
        }
    }

    return {
        clearSiteData,
        errorMessage,
    }
}
