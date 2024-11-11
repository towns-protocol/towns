import React, { useCallback, useState } from 'react'
import { Signer } from 'ethers'
import { Box, Button, ButtonProps, Icon, Text } from '@ui'
import { isTouch } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useConnectThenLink } from './useConnectThenLink'
import { WalletLinkingInfoLink } from '../WalletLinkingInfo'

type Props = {
    onLinkWallet: (rootKey: Signer | undefined, wallet: Signer | undefined) => void
    buttonText?: string
    children?: (props: { onClick: () => void }) => JSX.Element
} & Omit<ButtonProps, 'children' | 'onClick'>

export function ConnectWalletThenLinkButton(props: Props) {
    return (
        <WalletReady>
            {({ getSigner }) => <ConnectWalletThenLinkInner {...props} getSigner={getSigner} />}
        </WalletReady>
    )
}

function ConnectWalletThenLinkInner(props: Props & { getSigner: GetSigner }) {
    const { onLinkWallet, buttonText = 'Link Wallet', children, getSigner, ...buttonProps } = props
    const [showModal, setShowModal] = useState(false)
    const onConnect = useConnectThenLink({
        onLinkWallet,
        getSigner,
    })
    const { spaceBeingJoined } = usePublicPageLoginFlow()
    const { clickedLinkWalletOnGatedTownRequirementsModal } = useJoinFunnelAnalytics()

    const onConnectClick = useCallback(() => {
        if (spaceBeingJoined) {
            clickedLinkWalletOnGatedTownRequirementsModal({ spaceId: spaceBeingJoined })
        }
        onConnect()
    }, [onConnect, spaceBeingJoined, clickedLinkWalletOnGatedTownRequirementsModal])

    const onClick = useCallback(() => {
        if (isTouch()) {
            setShowModal(true)
        } else {
            onConnectClick()
        }
    }, [onConnectClick])

    const onModalConfirm = useCallback(() => {
        onConnectClick()
        setShowModal(false)
    }, [onConnectClick])

    return (
        <>
            {children ? (
                children({ onClick })
            ) : (
                <Button onClick={onClick} {...buttonProps}>
                    <Icon type="link" /> {buttonText}
                </Button>
            )}

            {showModal && (
                <ModalContainer asSheet minWidth="auto" onHide={() => setShowModal(false)}>
                    <Box padding="md" gap="lg" alignItems="center">
                        <Text strong size="lg">
                            Confirm Base Network Compatibility
                        </Text>
                        <Box textAlign="left" gap="sm">
                            <WalletLinkingInfoLink
                                text="
                            Please confirm that the wallet you are about to link has been
                                switched to the Base network."
                            />
                        </Box>
                        <Box horizontal gap alignSelf="end">
                            <Button tone="level2" onClick={() => setShowModal(false)}>
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
