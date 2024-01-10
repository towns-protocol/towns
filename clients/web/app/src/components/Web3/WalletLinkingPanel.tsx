import React, { useState } from 'react'
import { Address, useBalance } from 'wagmi'
import { useConnectWallet, usePrivy, useWallets } from '@privy-io/react-auth'
import { useEmbeddedWallet, useGetEmbeddedSigner } from '@towns/privy'
import {
    BlockchainTransactionType,
    useIsTransactionPending,
    useLinkWalletTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-zion-client'
import { usePrivyWagmi } from '@privy-io/wagmi-connector'
import { Box, BoxProps, Button, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/Panel'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useAuth } from 'hooks/useAuth'
import { shortAddress } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { formatEthDisplay } from './utils'

export function WalletLinkingPanel() {
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
    const { loggedInWalletAddress } = useAuth()
    const { wallets: connectedWallets } = useWallets()
    const { linkWalletTransaction } = useLinkWalletTransaction()
    const { unlinkWalletTransaction } = useUnlinkWalletTransaction()
    const getSigner = useGetEmbeddedSigner()

    const onLinkClick = useConnectThenLink({
        onLinkWallet: linkWalletTransaction,
    })

    const { data: linkedWallets } = useLinkedWallets()

    async function onUnlinkClick(addressToUnlink: Address) {
        const signer = await getSigner()
        if (!signer || !connectedWallets) {
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
        <Stack padding gap grow position="relative" overflow="auto">
            <LinkedWallet
                address={loggedInWalletAddress}
                loggedInWalletAddress={loggedInWalletAddress}
            />
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
                onClick={onLinkClick}
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
}: {
    text?: string
    background?: BoxProps['background']
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
                opacity="0.9"
                position="absolute"
                background={background}
                width="100%"
                height="100%"
            />
            <Stack gap="lg" position="relative">
                <Text>{text}</Text>
                <ButtonSpinner />
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
    const isTownsWallet = address === loggedInWalletAddress
    const townsBalance = useBalance({
        address: address,
        enabled: isTownsWallet,
        watch: true,
    })
    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)
    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)

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
                <Paragraph>
                    {isTownsWallet ? 'Towns Wallet' : 'External Wallet'}
                    {isTownsWallet && (
                        <>
                            {' '}
                            -{' '}
                            {formatEthDisplay(
                                Number.parseFloat(townsBalance?.data?.formatted ?? '0'),
                            )}{' '}
                            {townsBalance?.data?.symbol}
                        </>
                    )}
                </Paragraph>
                <ClipboardCopy label={shortAddress(address)} clipboardContent={address} />
            </Stack>

            {isTownsWallet ? (
                <ExportWallet />
            ) : (
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
                    onClick={() => onUnlinkClick?.(address)}
                />
            )}
        </PanelButton>
    )
}

function ExportWallet() {
    const { ready, authenticated, exportWallet } = usePrivy()
    const isAuthenticated = ready && authenticated
    const embeddedWallet = !!useEmbeddedWallet()
    return (
        <IconButton
            disabled={!isAuthenticated || !embeddedWallet}
            icon="linkOutWithFrame"
            color="default"
            onClick={exportWallet}
        />
    )
}

export function useConnectThenLink({
    onLinkWallet,
}: {
    onLinkWallet: (
        ...args: Parameters<ReturnType<typeof useLinkWalletTransaction>['linkWalletTransaction']>
    ) => void
}) {
    const embeddedWallet = useEmbeddedWallet()
    const { setActiveWallet } = usePrivyWagmi()
    const getSigner = useGetEmbeddedSigner()

    const { connectWallet } = useConnectWallet({
        onSuccess: async (wallet) => {
            const rootSigner = await getSigner()
            if (!embeddedWallet) {
                console.error('no embedded wallet')
                return
            }
            try {
                await setActiveWallet(embeddedWallet)
            } catch (error) {
                console.error('Could not set active wallet')
                return
            }
            onLinkWallet(rootSigner, (await wallet.getEthersProvider()).getSigner())
        },
    })

    return connectWallet
}
