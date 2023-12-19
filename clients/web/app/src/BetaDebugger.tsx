import React, { useEffect, useState } from 'react'
import { useZionContext } from 'use-zion-client'
import { usePrivyWagmi } from '@privy-io/wagmi-connector'
import { useEmbeddedWallet } from '@towns/privy'
import { Box, Button, Paragraph, Text, TextButton } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useNetworkStatus } from 'hooks/useNetworkStatus'

export function BetaDebugger() {
    const { wallet: activeWallet } = usePrivyWagmi()
    const embeddedWallet = useEmbeddedWallet()
    const [isVisible, setIsVisible] = useState(false)
    const show = () => setIsVisible(true)
    const hide = () => setIsVisible(false)
    const { errorMessage, clearSiteData } = useClearSiteData()
    const { streamSyncActive } = useZionContext()
    const [mismatchedActiveWallet, setMismatchedActiveWallet] = useState(false)
    const { isOffline } = useNetworkStatus()

    useEffect(() => {
        if (!activeWallet?.address || !embeddedWallet?.address) {
            return
        }
        setMismatchedActiveWallet(activeWallet?.address !== embeddedWallet?.address)
    }, [activeWallet?.address, embeddedWallet?.address])

    return (
        <Box paddingTop="safeAreaInsetTop" position="topLeft">
            <Box
                horizontal
                paddingLeft="xs"
                paddingTop="xs"
                fontSize="xs"
                zIndex="debug"
                background="level1"
                pointerEvents="none"
                alignItems="center"
                gap="sm"
            >
                <Box
                    width="x1"
                    height="x1"
                    rounded="full"
                    background={streamSyncActive && !isOffline ? 'cta1' : 'error'}
                />

                <Text size="xs" color={mismatchedActiveWallet ? 'error' : 'default'}>
                    Active wallet: {shortAddress(activeWallet?.address ?? '')}
                </Text>
                <Box pointerEvents="all">
                    <TextButton color="error" onClick={show}>
                        <Paragraph size="xs">Reset</Paragraph>
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
        </Box>
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
