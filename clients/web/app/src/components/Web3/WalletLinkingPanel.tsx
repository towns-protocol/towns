import React, { useMemo, useState } from 'react'
import {
    Address,
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-towns-client'

import { Box, BoxProps, Button, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import {
    isAbstractAccountAddress,
    useAbstractAccountAddress,
} from 'hooks/useAbstractAccountAddress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { GetSigner, LoginToPrivyIconButton, WalletReady } from 'privy/WalletReady'
import { useErrorToast } from 'hooks/useErrorToast'
import { ConnectWalletThenLinkButton } from './ConnectWalletThenLinkButton'
import { WalletLinkingInfo } from './WalletLinkingInfo'
import { WalletWithBalance } from './Wallet/WalletWithBalance'
import { UserOpTxModal } from './UserOpTxModal/UserOpTxModal'
import { mapToErrorMessage } from './utils'

export const WalletLinkingPanel = React.memo(() => {
    return <WalletLinkingPanelWithoutAuth />
})

function WalletLinkingPanelWithoutAuth() {
    const [unlinkModal, setUnlinkModal] = useState<{
        visible: boolean
        addressToUnlink?: Address
    }>({
        visible: false,
        addressToUnlink: undefined,
    })
    const showUnlinkModal = (addressToUnlink: Address) =>
        setUnlinkModal({
            visible: true,
            addressToUnlink: addressToUnlink,
        })
    const hideUnlinkModal = () =>
        setUnlinkModal({
            visible: false,
            addressToUnlink: undefined,
        })
    const { loggedInWalletAddress } = useConnectivity()
    const { linkEOAToRootKeyTransaction } = useLinkEOAToRootKeyTransaction()
    const { unlinkWalletTransaction } = useUnlinkWalletTransaction()

    const { data: aaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { data: _linkedWallets } = useLinkedWallets()
    const linkedWallets = useMemo(
        () =>
            _linkedWallets
                ?.slice()
                .sort((a) => (a.toLowerCase() === aaAddress?.toLowerCase() ? -1 : 1)),
        [_linkedWallets, aaAddress],
    )

    async function onUnlinkClick(addressToUnlink: Address, getSigner: GetSigner) {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        unlinkWalletTransaction(signer, addressToUnlink)
    }

    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)
    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)

    if (!loggedInWalletAddress) {
        return null
    }

    const isDisabled = isWalletLinkingPending || isWalletUnLinkingPending

    return (
        <Stack gap grow position="relative" overflow="auto">
            {linkedWallets?.map((a) => {
                return (
                    <LinkedWallet
                        address={a as Address}
                        aaAddress={aaAddress}
                        key={a}
                        onUnlinkClick={showUnlinkModal}
                    />
                )
            })}

            <ConnectWalletThenLinkButton onLinkWallet={linkEOAToRootKeyTransaction}>
                {({ onClick }) => (
                    <PanelButton
                        cursor={isDisabled ? 'not-allowed' : 'pointer'}
                        opacity={isDisabled ? '0.5' : 'opaque'}
                        disabled={isDisabled}
                        onClick={onClick}
                    >
                        <Box width="height_md" alignItems="center">
                            <Icon type="link" size="square_sm" />
                        </Box>
                        <Paragraph color="default">Link new wallet</Paragraph>
                    </PanelButton>
                )}
            </ConnectWalletThenLinkButton>

            <WalletLinkingInfo />

            {/* {isLoadingLinkingWallet && <FullPanelOverlay text="Linking Wallet" />} */}
            {/* {isLoadingUnlinkingWallet && <FullPanelOverlay text="Unlinking Wallet" />} */}

            {unlinkModal.visible && (
                <ModalContainer asSheet minWidth="auto" onHide={hideUnlinkModal}>
                    <Box padding="sm" gap="lg" alignItems="center">
                        <Text>Are you sure you want to unlink</Text>
                        <Text
                            fontSize={{
                                mobile: 'sm',
                            }}
                        >
                            {unlinkModal.addressToUnlink}?
                        </Text>
                        <Box horizontal gap>
                            <Button tone="level2" onClick={hideUnlinkModal}>
                                Cancel
                            </Button>
                            <WalletReady>
                                {({ getSigner }) => (
                                    <Button
                                        tone="negative"
                                        onClick={() => {
                                            if (unlinkModal.addressToUnlink) {
                                                onUnlinkClick(
                                                    unlinkModal.addressToUnlink,
                                                    getSigner,
                                                )
                                                hideUnlinkModal()
                                            }
                                        }}
                                    >
                                        Confirm
                                    </Button>
                                )}
                            </WalletReady>
                        </Box>
                    </Box>
                </ModalContainer>
            )}
            <UserOpTxModal />
        </Stack>
    )
}

export function FullPanelOverlay({
    text,
    background,
    withSpinner = true,
    opacity = '0.9',
}: {
    text?: string
    background?: BoxProps['background']
    withSpinner?: boolean
    opacity?: BoxProps['opacity']
}) {
    return (
        <Stack absoluteFill centerContent zIndex="above">
            <Stack
                opacity={opacity}
                position="absolute"
                background={background}
                style={!background ? { background: 'var(--background)' } : undefined}
                width="100%"
                height="100%"
            />
            <Stack gap="lg" position="relative">
                <Text>{text}</Text>
                {withSpinner && <ButtonSpinner />}
            </Stack>
        </Stack>
    )
}

export function LinkedWallet({
    address,
    aaAddress,
    height = 'x8',
}: {
    address: Address
    aaAddress: Address | undefined
    onUnlinkClick?: (address: Address) => void
    height?: BoxProps['height']
}) {
    const { openPanel } = usePanelActions()

    const isAbstractAccount =
        aaAddress && isAbstractAccountAddress({ address, abstractAccountAddress: aaAddress })

    const onWalletClick = () => {
        if (isAbstractAccount) {
            openPanel('wallet', { assetSource: address })
        }
    }

    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)
    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)
    const isDisabled = isWalletLinkingPending || isWalletUnLinkingPending

    // TODO: we have a privy wallet, and AA wallet. Probably we want to filter out the privy wallet, and only show AA wallet address. Do we need to have our own UI for AA wallet assets? Since you can't export it to MM
    return (
        <PanelButton
            as="div"
            background="level2"
            hoverable={isAbstractAccount}
            cursor={isAbstractAccount ? 'pointer' : 'auto'}
            justifyContent="spaceBetween"
            height={height}
            onClick={onWalletClick}
        >
            <WalletWithBalance
                address={address}
                isAbstractAccount={!!isAbstractAccount}
                UnlinkButton={<UnlinkButton address={address} isDisabled={isDisabled} />}
            />
        </PanelButton>
    )
}

function UnlinkButton({ address, isDisabled }: { address: Address; isDisabled: boolean }) {
    const { unlinkWalletTransaction, error: errorUnlinkWallet } = useUnlinkWalletTransaction()

    useErrorToast({
        errorMessage: errorUnlinkWallet
            ? mapToErrorMessage({
                  error: errorUnlinkWallet,
                  source: 'token verification unlink wallet',
              })
            : undefined,
    })

    async function onUnlinkClick(addressToUnlink: Address, getSigner: GetSigner) {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        unlinkWalletTransaction(signer, addressToUnlink)
    }

    return (
        <WalletReady
            LoginButton={
                <LoginToPrivyIconButton message="Unlinking a wallet requires re-authentication with Privy." />
            }
        >
            {({ getSigner }) => (
                <IconButton
                    cursor={isDisabled ? 'not-allowed' : 'pointer'}
                    disabled={isDisabled}
                    opacity={isDisabled ? '0.5' : 'opaque'}
                    icon="unlink"
                    color="default"
                    tooltip="Unlink Wallet"
                    onClick={() => onUnlinkClick(address, getSigner)}
                />
            )}
        </WalletReady>
    )
}
