import React, { useCallback, useState } from 'react'
import { useUnlinkViaCallerTransaction } from 'use-towns-client'
import { Box, Button, ButtonProps, Icon, Text } from '@ui'
import { isTouch } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { WalletReady } from 'privy/WalletReady'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { WalletLinkingInfoLink } from '../WalletLinkingInfo'
import { switchConnectedWalletChain } from './switchConnectedWalletChain'
import { usePrivyConnectWallet } from './usePrivyConnectWallet'

type Props = Omit<ButtonProps, 'children' | 'onClick'> & {
    isDisabled: boolean
}

export function ConnectWalletThenUnlinkViaCaller(props: Props) {
    return <WalletReady>{() => <ConnectWalletThenUnlinkInner {...props} />}</WalletReady>
}

function ConnectWalletThenUnlinkInner(props: Props) {
    const { isDisabled } = props
    const [showMobileModal, setShowMobileModal] = useState(false)
    const onConnect = useConnectThenUnlinkViaCaller()

    const onClick = useCallback(() => {
        if (isTouch()) {
            setShowMobileModal(true)
        } else {
            onConnect()
        }
    }, [onConnect])

    const onModalConfirm = useCallback(() => {
        onConnect()
        setShowMobileModal(false)
    }, [onConnect])

    return (
        <>
            <Box padding gap rounded="sm" justifyContent="start">
                <Box horizontal gap="sm">
                    <Icon type="help" size="square_xs" color="gray2" shrink={false} />
                    <Box gap>
                        <Text display="inline" size="sm">
                            Linked a wallet to another Towns account? You can unlink it here.
                        </Text>
                    </Box>
                </Box>
                <Button size="button_sm" tone="level2" disabled={isDisabled} onClick={onClick}>
                    <Icon type="unlink" size="square_xs" />
                    Unlink
                </Button>
            </Box>

            {showMobileModal && (
                <ModalContainer asSheet minWidth="auto" onHide={() => setShowMobileModal(false)}>
                    <Box padding="md" gap="lg" alignItems="center">
                        <Text strong size="lg">
                            Confirm Base Network Compatibility
                        </Text>
                        <Box textAlign="left" gap="sm">
                            <WalletLinkingInfoLink
                                text="
                            Please confirm that the wallet you are about to unlink has been
                                switched to the Base network."
                            />
                        </Box>
                        <Box horizontal gap alignSelf="end">
                            <Button tone="level2" onClick={() => setShowMobileModal(false)}>
                                Cancel
                            </Button>
                            <Button tone="cta1" onClick={onModalConfirm}>
                                Confirm
                            </Button>
                        </Box>
                    </Box>
                </ModalContainer>
            )}
        </>
    )
}

export function useConnectThenUnlinkViaCaller() {
    const { baseChain } = useEnvironment()
    const { unlinkViaCallerTransaction } = useUnlinkViaCallerTransaction()

    return usePrivyConnectWallet({
        onSuccess: async (wallet) => {
            switchConnectedWalletChain({
                wallet,
                baseChain,
                onSuccess: (signer) => {
                    unlinkViaCallerTransaction(signer)
                },
            })
        },
    })
}
