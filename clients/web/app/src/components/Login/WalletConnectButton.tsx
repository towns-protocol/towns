import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useConnect } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { createPortal } from 'react-dom'
import { FancyButton } from 'ui/components/Button/FancyButton'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useInterval } from 'hooks/useInterval'
import { useDevice } from 'hooks/useDevice'
import { Box, Button, IconButton, Text, useZLayerContext } from '@ui'
import { CenteredModalContainer } from '@components/Modals/ModalContainer'
import { useDocumentHidden } from 'hooks/useDocumentHidden'
import { useWalletConnectProvider } from 'hooks/useWalletConnectProvider'

export const WalletConnectButton = () => {
    const { chainId } = useEnvironment()
    const { connect, connectors } = useConnect({
        chainId,
    })
    const root = useZLayerContext().rootLayerRef?.current

    const walletConnect = connectors?.find(
        (c): c is WalletConnectConnector => c instanceof WalletConnectConnector,
    )
    const [modal, setShowModal] = useState(false)
    const showModal = useCallback(() => setShowModal(true), [])
    const hideModal = useCallback(() => setShowModal(false), [])
    const reloadPage = useCallback(() => window.location.reload(), [])

    useCheckWalletConnectIssues({
        walletConnect,
        onShowAlert: showModal,
    })

    const buttonClicked = useCallback(() => {
        connect({ connector: walletConnect })
    }, [connect, walletConnect])

    const isPWA = useDevice().isPWA

    return (
        <>
            <FancyButton cta disabled={!walletConnect?.ready} onClick={buttonClicked}>
                Connect Wallet
            </FancyButton>
            {modal &&
                root &&
                createPortal(
                    <Box absoluteFill zIndex="uiAbove">
                        <CenteredModalContainer onHide={hideModal}>
                            <Box gap>
                                <Box alignItems="end">
                                    <IconButton icon="close" />
                                </Box>
                                <Text size="md" textAlign="center">
                                    {`Looks like there's an issue connecting to your wallet. If this persists, please try ${
                                        isPWA ? 'restarting the app' : 'refreshing the page'
                                    }.`}
                                </Text>
                                <Box horizontal centerContent gap paddingTop="md">
                                    <Button size="button_sm" onClick={hideModal}>
                                        Dismiss
                                    </Button>
                                    {isPWA && (
                                        <Button tone="cta1" size="button_sm" onClick={reloadPage}>
                                            Reload now
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </CenteredModalContainer>
                    </Box>,
                    // document.body b/c wallet connect modal is rendered in a portal outside of our root
                    document.body,
                )}
        </>
    )
}

// wallet connect + metamask (maybe other wallets too, but metamask is all i've had issues with) doesn't always connect
// this hook will show an alert if the user tries to connect to wallet, then navigates back to the app, and nothing happens
// we can't verify or check what happened in users' wallets, so this hack is the best we can do for now
// some observed behaviors:
// - user clicks connect, MM opens, there's no dialog in MM to connect, user navigates back to app, nothing happens
// - user clicks connect, MM opens, there's a dialog in MM to connect, user clicks connect, MM says success, user navigates back to app, nothing happens
function useCheckWalletConnectIssues({
    walletConnect,
    onShowAlert,
    alertDelay = 4000, // at 4 seconds because WC is slooow sometimes
}: {
    walletConnect: WalletConnectConnector | undefined
    onShowAlert: () => void
    alertDelay?: number
}) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>()
    const documentHidden = useDocumentHidden()
    const navigatedToWallet = useRef<boolean | undefined>()
    const walletConnectModalOpen = useRef(false)
    const connected = useRef(false)
    const connectionAttempts = useRef(0)

    useEffect(() => {
        function handleConnect() {
            connected.current = true
            clearTimeout(timeoutRef.current)
        }
        walletConnect?.on('connect', handleConnect)
        return () => {
            walletConnect?.off('connect', handleConnect)
        }
    }, [walletConnect])

    useWalletConnectModalSubscription({
        callback: (state) => {
            if (state.open) {
                walletConnectModalOpen.current = true
            } else {
                walletConnectModalOpen.current = false
                clearTimeout(timeoutRef.current)
            }
        },
    })

    // in case of unmount before WC's connect event fires
    useEffect(() => {
        return () => {
            clearTimeout(timeoutRef.current)
        }
    }, [])

    useInterval(
        () => {
            // the modal's not open so don't do anything
            if (!walletConnectModalOpen.current) {
                clearTimeout(timeoutRef.current)
                return
            }
            // if the modal was open and now the app is hidden, probably the user opened their wallet
            if (navigatedToWallet.current === undefined && documentHidden) {
                navigatedToWallet.current = true
                clearTimeout(timeoutRef.current)
            }

            // now they are back in the app
            if (navigatedToWallet.current && !documentHidden) {
                if (timeoutRef.current) {
                    return
                }
                connectionAttempts.current += 1
                // probably we only want to show this if they tried connecting more than once
                if (connectionAttempts.current > 1) {
                    timeoutRef.current = setTimeout(() => {
                        if (!connected.current) {
                            onShowAlert()
                        }
                        // reset in case they repeat the same flow
                        timeoutRef.current = undefined
                        navigatedToWallet.current = undefined
                    }, alertDelay)
                } else {
                    // reset in case they repeat the same flow
                    navigatedToWallet.current = undefined
                }
            }
        },
        // don't run if the timeout is already set
        timeoutRef.current ? null : 1000,
    )
}

function useWalletConnectModalSubscription({
    callback,
}: {
    callback: (state: { open: boolean }) => void
}) {
    const provider = useWalletConnectProvider()
    const callbackRef = useRef(callback)

    useEffect(() => {
        const unsubscribe = provider?.modal?.subscribeModal(callbackRef.current)

        return () => {
            unsubscribe?.()
        }
    }, [provider])
}
