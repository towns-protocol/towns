import React, { useEffect, useState } from 'react'
import { useWeb3Context } from 'use-zion-client'
import { usePrivyWagmi } from '@privy-io/wagmi-connector'
import { Box, Button, Icon, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ModalContainer } from '@components/Modals/ModalContainer'

export function BetaDebugger() {
    const { signer } = useWeb3Context()
    const [signerAddress, setSignerAddress] = useState<string | undefined>()
    const { wallet: activeWallet } = usePrivyWagmi()
    const [isVisible, setIsVisible] = useState(false)
    const show = () => setIsVisible(true)
    const hide = () => setIsVisible(false)
    const { errorMessage, clearSiteData } = useClearSiteData()

    useEffect(() => {
        if (signer) {
            signer.getAddress().then(setSignerAddress)
        } else {
            setSignerAddress(undefined)
        }
    }, [signer])

    return (
        <Box
            horizontal
            paddingTop="xs"
            gap="sm"
            position="fixed"
            top="none"
            left="none"
            fontSize="xs"
            zIndex="tooltipsAbove"
            rounded="sm"
            background="readability"
            pointerEvents="none"
        >
            <Box horizontal>
                <Text size="xs">
                    Signer: {shortAddress(signerAddress ?? '')} <br />
                </Text>
                <Icon
                    display="inline-block"
                    size="square_xxs"
                    type={signer ? 'check' : 'alert'}
                    color={signer ? 'cta1' : 'error'}
                />
            </Box>
            <Text size="xs">Active wallet: {shortAddress(activeWallet?.address ?? '')}</Text>
            <Box pointerEvents="all">
                <Button size="inline" color="cta1" onClick={show}>
                    Reset
                </Button>
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
