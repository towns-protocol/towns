import React, { useState } from 'react'
import { useBalance } from 'wagmi'
import { useConnectWallet, usePrivy, useWallets } from '@privy-io/react-auth'
import { useEmbeddedWallet, useGetEmbeddedSigner } from '@towns/privy'
import {
    Address,
    BlockchainTransactionType,
    useIsTransactionPending,
    useLinkCallerToRootKey,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-towns-client'
import { usePrivyWagmi } from '@privy-io/wagmi-connector'
import { useSearchParams } from 'react-router-dom'
import { Box, BoxProps, Button, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useAuth } from 'hooks/useAuth'
import { shortAddress } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import {
    isAbstractAccountAddress,
    useAbstractAccountAddress,
} from 'hooks/useAbstractAccountAddress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useIsSmartAccountLinked } from 'hooks/useIsSmartAccountLinked'
import { env } from 'utils'
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
    const { linkEOAToRootKeyTransaction } = useLinkEOAToRootKeyTransaction()
    const { linkCallerToRootKeyTransaction } = useLinkCallerToRootKey()
    const { unlinkWalletTransaction } = useUnlinkWalletTransaction()
    const getSigner = useGetEmbeddedSigner()

    const onLinkEOAClick = useConnectThenLink({
        onLinkWallet: linkEOAToRootKeyTransaction,
    })

    const { data: smartAccountLinked, isLoading: isSmartAccountLinkedLoading } =
        useIsSmartAccountLinked()

    const { data: linkedWallets } = useLinkedWallets()

    async function onUnlinkClick(addressToUnlink: Address) {
        const signer = await getSigner()
        if (!signer || !connectedWallets) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        unlinkWalletTransaction(signer, addressToUnlink)
    }

    async function onLinkSmartAccountClick() {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        linkCallerToRootKeyTransaction(signer)
    }

    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)
    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)

    if (!loggedInWalletAddress) {
        return null
    }

    return (
        <Stack gap grow position="relative" overflow="auto">
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
                onClick={onLinkEOAClick}
            >
                <Box width="height_md" alignItems="center">
                    <Icon type="link" size="square_sm" />
                </Box>
                <Paragraph color="default">Link new wallet</Paragraph>
            </PanelButton>

            {/* TODO: remove this https://linear.app/hnt-labs/issue/HNT-5662/remove-auto-smart-account-linking-from-app  */}
            {isSmartAccountLinkedLoading || smartAccountLinked ? null : (
                <PanelButton
                    cursor={
                        isWalletLinkingPending || isWalletUnLinkingPending
                            ? 'not-allowed'
                            : 'pointer'
                    }
                    opacity={isWalletLinkingPending || isWalletUnLinkingPending ? '0.5' : 'opaque'}
                    disabled={isWalletLinkingPending || isWalletUnLinkingPending}
                    onClick={onLinkSmartAccountClick}
                >
                    <Box width="height_md" alignItems="center">
                        <Icon type="link" size="square_sm" />
                    </Box>
                    <Paragraph color="default">Link Smart Account</Paragraph>
                </PanelButton>
            )}
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
    const [searchParams] = useSearchParams()
    const isTownsWallet = address === loggedInWalletAddress
    const townsBalance = useBalance({
        address: address,
        enabled: isTownsWallet,
        watch: true,
    })
    const { data: aaAdress, isLoading: isLoadingAaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
    const isAbstractAccount =
        aaAdress && isAbstractAccountAddress({ address, abstractAccountAddress: aaAdress })

    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)
    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)
    const hasUnlinkParam = searchParams.get('unlinkAA') != null
    const enableUnlinkAAOn = env.DEV && hasUnlinkParam

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
                {/* TODO: we should retain this for development against anvil */}
                {isTownsWallet && (
                    <Paragraph size="sm" color="error">
                        Deprecated
                    </Paragraph>
                )}
                <ClipboardCopy label={shortAddress(address)} clipboardContent={address} />
            </Stack>

            {isTownsWallet ? (
                <ExportWallet />
            ) : isLoadingAaAddress ? null : isAbstractAccount && !enableUnlinkAAOn ? (
                'AA Account'
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
        ...args: Parameters<
            ReturnType<typeof useLinkEOAToRootKeyTransaction>['linkEOAToRootKeyTransaction']
        >
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
