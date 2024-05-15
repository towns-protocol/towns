import React, { useState } from 'react'
import { useConnectWallet } from '@privy-io/react-auth'
import { useEmbeddedWallet, useGetEmbeddedSigner } from '@towns/privy'
import {
    Address,
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-towns-client'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { Box, BoxProps, Button, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import {
    isAbstractAccountAddress,
    useAbstractAccountAddress,
} from 'hooks/useAbstractAccountAddress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useBalance } from 'hooks/useBalance'
import { formatEthDisplay } from './utils'

export const WalletLinkingPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <WalletLinkingPanelWithoutAuth />
        </PrivyWrapper>
    )
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
    const getSigner = useGetEmbeddedSigner()

    const onLinkEOAClick = useConnectThenLink({
        onLinkWallet: linkEOAToRootKeyTransaction,
    })

    const { data: linkedWallets } = useLinkedWallets()

    async function onUnlinkClick(addressToUnlink: Address) {
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

    return (
        <Stack gap grow position="relative" overflow="auto">
            {linkedWallets?.map((a) => {
                return (
                    <LinkedWallet
                        address={a as Address}
                        loggedInWalletAddress={loggedInWalletAddress}
                        key={a}
                        onUnlinkClick={showUnlinkModal}
                    />
                )
            })}
            <PanelButton
                cursor={
                    isWalletLinkingPending || isWalletUnLinkingPending ? 'not-allowed' : 'pointer'
                }
                opacity={isWalletLinkingPending || isWalletUnLinkingPending ? '0.5' : 'opaque'}
                disabled={isWalletLinkingPending || isWalletUnLinkingPending}
                onClick={onLinkEOAClick}
            >
                <Box width="height_md" alignItems="center">
                    <Icon type="link" size="square_sm" />
                </Box>
                <Paragraph color="default">Link new wallet</Paragraph>
            </PanelButton>

            {/* {isLoadingLinkingWallet && <FullPanelOverlay text="Linking Wallet" />} */}
            {/* {isLoadingUnlinkingWallet && <FullPanelOverlay text="Unlinking Wallet" />} */}

            {unlinkModal.visible && (
                <ModalContainer minWidth="auto" onHide={hideUnlinkModal}>
                    <Box padding="sm" gap="lg" alignItems="center">
                        <Text>Are you sure you want to unlink</Text>
                        <Text>{unlinkModal.addressToUnlink}?</Text>
                        <Box horizontal gap>
                            <Button tone="level2" onClick={hideUnlinkModal}>
                                Cancel
                            </Button>
                            <Button
                                tone="negative"
                                onClick={() => {
                                    if (unlinkModal.addressToUnlink) {
                                        onUnlinkClick(unlinkModal.addressToUnlink)
                                        hideUnlinkModal()
                                    }
                                }}
                            >
                                Confirm
                            </Button>
                        </Box>
                    </Box>
                </ModalContainer>
            )}
        </Stack>
    )
}

export function FullPanelOverlay({
    text,
    background = 'level3',
    withSpinner = true,
    opacity = '0.9',
}: {
    text?: string
    background?: BoxProps['background']
    withSpinner?: boolean
    opacity?: BoxProps['opacity']
}) {
    return (
        <Stack
            position="absolute"
            left="none"
            top="none"
            width="100%"
            height="100%"
            justifyContent="center"
            alignItems="center"
        >
            <Stack
                opacity={opacity}
                position="absolute"
                background={background}
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
    loggedInWalletAddress,
    onUnlinkClick,
    height = 'x8',
}: {
    address: Address
    loggedInWalletAddress: Address
    onUnlinkClick?: (address: Address) => void
    height?: BoxProps['height']
}) {
    const { data: aaAdress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
    const isAbstractAccount =
        aaAdress && isAbstractAccountAddress({ address, abstractAccountAddress: aaAdress })

    const aaBalance = useBalance({
        address: address,
        enabled: isAbstractAccount,
        watch: true,
    })

    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)
    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)

    // TODO: we have a privy wallet, and AA wallet. Probably we want to filter out the privy wallet, and only show AA wallet address. Do we need to have our own UI for AA wallet assets? Since you can't export it to MM
    return (
        <PanelButton
            cursor="auto"
            as="div"
            background="level3"
            hoverable={false}
            justifyContent="spaceBetween"
            height={height}
        >
            <Stack gap="sm" alignItems="start">
                {isAbstractAccount && (
                    <Paragraph>
                        Towns Wallet -{' '}
                        {formatEthDisplay(Number.parseFloat(aaBalance?.data?.formatted ?? '0'))}{' '}
                        Base {aaBalance?.data?.symbol}
                    </Paragraph>
                )}

                <ClipboardCopy
                    color={isAbstractAccount ? 'gray2' : 'gray1'}
                    label={shortAddress(address)}
                    clipboardContent={address}
                />
            </Stack>

            {!isAbstractAccount && (
                <IconButton
                    cursor={
                        isWalletLinkingPending || isWalletUnLinkingPending
                            ? 'not-allowed'
                            : 'pointer'
                    }
                    disabled={isWalletLinkingPending || isWalletUnLinkingPending}
                    opacity={isWalletLinkingPending || isWalletUnLinkingPending ? '0.5' : 'opaque'}
                    icon="unlink"
                    color="default"
                    tooltip="Unlink Wallet"
                    onClick={() => onUnlinkClick?.(address)}
                />
            )}
        </PanelButton>
    )
}

export function useConnectThenLink({
    onLinkWallet,
}: {
    onLinkWallet: (
        ...args: Parameters<
            ReturnType<typeof useLinkEOAToRootKeyTransaction>['linkEOAToRootKeyTransaction']
        >
    ) => void
}) {
    const embeddedWallet = useEmbeddedWallet()
    const getSigner = useGetEmbeddedSigner()

    const { connectWallet } = useConnectWallet({
        onSuccess: async (wallet) => {
            const rootSigner = await getSigner()
            if (!embeddedWallet) {
                console.error('no embedded wallet')
                return
            }

            onLinkWallet(rootSigner, (await wallet.getEthersProvider()).getSigner())
        },
    })

    return connectWallet
}
