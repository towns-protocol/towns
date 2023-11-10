import React, { useEffect, useRef, useState } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { IWeb3Context } from 'use-zion-client/dist/components/Web3ContextProvider'
import { getConfig } from '@wagmi/core'
import { PrivyConnector, usePrivyWagmi } from '@privy-io/wagmi-connector'
import { Box, Button, Icon, Text } from '@ui'
import { useEmbeddedWallet } from 'hooks/useEmbeddedWallet'
import { shortAddress } from 'ui/utils/utils'
import { ModalContainer } from '@components/Modals/ModalContainer'

function getPrivyConnector() {
    const config = getConfig()
    const privyConnector = config.connectors.find((c) => c.id === 'privy') as
        | PrivyConnector
        | undefined
    return privyConnector
}

async function setSignerFromWalletClient({
    chainId,
    setSigner,
    embeddedWallet,
}: {
    chainId: number
    setSigner: IWeb3Context['setSigner']
    embeddedWallet: ReturnType<typeof useEmbeddedWallet>
}) {
    const privyConnector = getPrivyConnector()

    if (!privyConnector) {
        console.warn('setSignerFromWalletClient: privy connector not found')
        return
    }

    // if you load the app w/ another connected wallet, i.e. MM, then that's the activeWallet before you are logged in to Privy
    let activeWallet = privyConnector.getActiveWallet()

    // privy should be switching over to the embedded wallet as soon as it's ready, but just in case it doesn't
    if (embeddedWallet && activeWallet?.address !== embeddedWallet.address) {
        await privyConnector.setActiveWallet(embeddedWallet)
        activeWallet = privyConnector.getActiveWallet() // refetch the active wallet, probably not necessary just make sure it worked
    }

    // once privy is signed in, the activeWallet will be the privy wallet
    if (!activeWallet || activeWallet.walletClientType !== 'privy') {
        console.warn('setSignerFromWalletClient: active wallet is not privy wallet')
        return
    }

    try {
        // make sure the connector is ready https://github.com/wagmi-dev/references/issues/167#issuecomment-1470698087
        await privyConnector.getProvider()
    } catch (error) {
        console.error(
            'setSignerFromWalletClient: error getting provider from privy connector',
            error,
        )
        return
    }

    const wc = await privyConnector.getWalletClient({ chainId })
    setSigner(walletClientToSigner(wc))
}

// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function SetSignerFromWalletClient({ chainId }: { chainId: number }) {
    usePrivyConnectorEventListener({
        chainId,
    })

    return <BetaDebugger />
}

function usePrivyConnectorEventListener({ chainId }: { chainId: number }) {
    const privyConnector = getPrivyConnector()
    const embeddedWallet = useEmbeddedWallet()
    const { setSigner } = useWeb3Context()
    const initialSet = useRef(false)

    useEffect(() => {
        if (!privyConnector) {
            return
        }

        function onChange() {
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
            })
        }
        // just in case app loads with non privy wallet connected,
        // and privy for some reason doesn't fire the change event to switch to the embedded wallet
        if (embeddedWallet && !initialSet.current) {
            initialSet.current = true
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
            })
        }

        privyConnector.on('change', onChange)
        // Other methods available
        // privyConnector.on('connect', onConnect)
        // privyConnector.on('disconnect', onDisconnect)
        // privyConnector.on('error', onError)
        // privyConnector.on('message', onMessage)
        return () => {
            privyConnector.off('change', onChange)
        }
    }, [privyConnector, embeddedWallet, chainId, setSigner])
}

function BetaDebugger() {
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

        // Clear IndexedDB databases with names containing "pizza"
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
