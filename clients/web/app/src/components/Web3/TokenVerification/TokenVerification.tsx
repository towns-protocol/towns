import React, { PropsWithChildren, useCallback, useState } from 'react'
import {
    Address,
    BlockchainTransactionType,
    Permission,
    useConnectivity,
    useHasPermission,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Button, Icon, IconButton, MotionBox, Paragraph, Stack, Text } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { Entitlements, useEntitlements } from 'hooks/useEntitlements'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { TokenSelectionDisplayWithMetadata } from 'routes/RoleRestrictedChannelJoinPanel'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Analytics } from 'hooks/useAnalytics'
import { FullPanelOverlay, LinkedWallet } from '../WalletLinkingPanel'
import { mapToErrorMessage } from '../utils'
import { useConnectThenLink } from '../useConnectThenLink'

type Props = {
    onHide: ({ shouldEndLoginFlow }: { shouldEndLoginFlow: boolean }) => void
    spaceId: string
    joinSpace: () => Promise<void>
}

export function TokenVerification({ onHide, spaceId, joinSpace }: Props) {
    const { data: linkedWallets } = useLinkedWallets()
    const { loggedInWalletAddress } = useConnectivity()
    const { data: entitlements } = useEntitlements(spaceId)
    const tokensLength = entitlements?.tokens.length ?? 0
    const maxWidth = tokensLength > 2 ? 'auto' : '400'
    const { getSigner } = useGetEmbeddedSigner()
    const { data: aaAdress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const {
        isLoading: isLoadingUnlinkingWallet,
        unlinkWalletTransaction,
        error: errorUnlinkWallet,
    } = useUnlinkWalletTransaction()

    useErrorToast({
        errorMessage: errorUnlinkWallet
            ? mapToErrorMessage({
                  error: errorUnlinkWallet,
                  source: 'token verification unlink wallet',
              })
            : undefined,
    })

    async function onUnlinkClick(addressToUnlink: Address) {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        unlinkWalletTransaction(signer, addressToUnlink)
    }

    return (
        <Stack position="relative" padding="lg" paddingTop="md" maxWidth={maxWidth} overflow="auto">
            <Stack alignItems="end">
                <IconButton icon="close" onClick={() => onHide({ shouldEndLoginFlow: true })} />
            </Stack>
            <Stack gap alignItems="center">
                <Text strong size="lg">
                    Digital Asset Required
                </Text>
                <Text color="gray1">{`Any of the following tokens must be held to claim membership:`}</Text>

                <Content
                    linkedWallets={linkedWallets}
                    entitlements={entitlements}
                    joinSpace={joinSpace}
                    onHide={() => onHide({ shouldEndLoginFlow: true })}
                >
                    {linkedWallets && linkedWallets.length > 1 ? (
                        <Paragraph strong>Linked Wallets</Paragraph>
                    ) : null}
                    {linkedWallets !== undefined &&
                        linkedWallets
                            // exclude showing the aaAdress in the list of linked wallets for digital asset requirement
                            // we don't want users sending assets here
                            .filter((a) => a !== aaAdress)
                            .map((a) => {
                                return (
                                    <Stack width="100%" key={a}>
                                        <LinkedWallet
                                            height="x7"
                                            address={a as Address}
                                            loggedInWalletAddress={loggedInWalletAddress ?? '0x'}
                                            onUnlinkClick={onUnlinkClick}
                                        />
                                    </Stack>
                                )
                            })}
                </Content>

                {isLoadingUnlinkingWallet && <FullPanelOverlay text="Unlinking Wallet" />}
            </Stack>
        </Stack>
    )
}

function Content({
    entitlements,
    linkedWallets,
    children,
    onHide,
    joinSpace,
}: PropsWithChildren<
    {
        linkedWallets: string[] | undefined
        entitlements: Entitlements
    } & Omit<Props, 'spaceId'>
>) {
    const { loggedInWalletAddress } = useConnectivity()
    const spaceId = useSpaceIdFromPathname()
    const {
        hasPermission: meetsMembershipRequirements,
        isLoading: isLoadingMeetsMembership,
        invalidate: invalidateJoinSpace,
        getQueryData: getJoinSpaceQueryData,
    } = useHasPermission({
        spaceId: spaceId,
        walletAddress: loggedInWalletAddress,
        permission: Permission.JoinSpace,
    })

    const { noAssets, tickNoAssets } = useNoAssetsState()
    const isJoinPending = useIsTransactionPending(BlockchainTransactionType.JoinSpace)
    const { isPrivyReady } = useGetEmbeddedSigner()

    const {
        isLoading: isLoadingLinkingWallet,
        linkEOAToRootKeyTransaction,
        error: errorLinkWallet,
    } = useLinkEOAToRootKeyTransaction({
        onSuccess: async () => {
            if (!loggedInWalletAddress) {
                return
            }
            await invalidateJoinSpace()

            const canJoin = getJoinSpaceQueryData()

            Analytics.getInstance().track('successfully linked wallet', {
                spaceId,
                meetsMembershipRequirements: canJoin,
            })

            if (!canJoin) {
                tickNoAssets()
            }
        },
    })

    const connectWalletThenLink = useConnectThenLink({
        onLinkWallet: linkEOAToRootKeyTransaction,
    })

    useErrorToast({
        errorMessage: errorLinkWallet
            ? mapToErrorMessage({
                  error: errorLinkWallet,
                  source: 'token verification link wallet',
              })
            : undefined,
    })

    const onJoinClick = useCallback(async () => {
        onHide({ shouldEndLoginFlow: false })
        Analytics.getInstance().track('clicked join town on link wallet modal', {
            spaceId,
        })
        await joinSpace()
    }, [joinSpace, onHide, spaceId])

    if (linkedWallets === undefined || isLoadingMeetsMembership) {
        return (
            <Stack centerContent height="x20">
                <ButtonSpinner />
            </Stack>
        )
    }

    return (
        <>
            <Stack width="100%" gap="sm">
                {entitlements.tokens.map((token) => {
                    return (
                        <TokenSelectionDisplayWithMetadata
                            wallets={linkedWallets}
                            key={token.address as Address}
                            token={token}
                            passesEntitlement={
                                meetsMembershipRequirements !== undefined &&
                                meetsMembershipRequirements
                            }
                        />
                    )
                })}
            </Stack>

            {meetsMembershipRequirements ? (
                <Button
                    disabled={!isPrivyReady || isJoinPending}
                    tone="cta1"
                    width="100%"
                    type="button"
                    onClick={onJoinClick}
                >
                    Join
                </Button>
            ) : (
                <>
                    {linkedWallets && linkedWallets.length > 1 ? (
                        <MotionBox
                            inset="xs"
                            padding="none"
                            opacity="transparent"
                            animate={{
                                opacity: noAssets ? 1 : 0,
                                bottom: noAssets ? '50px' : 0,
                            }}
                        >
                            <Text color="error" size="sm">
                                Wallet missing assets
                            </Text>
                        </MotionBox>
                    ) : null}

                    {children}

                    <Button tone="cta1" width="100%" onClick={connectWalletThenLink}>
                        <Icon type="link" />
                        Link a wallet with asset
                    </Button>

                    {isLoadingLinkingWallet && <FullPanelOverlay text="Linking Wallet" />}
                </>
            )}
        </>
    )
}

export function useNoAssetsState() {
    const [noAssets, setNoAssets] = useState(false)

    const tickNoAssets = useCallback(() => {
        setNoAssets(true)
        setTimeout(() => {
            setNoAssets(false)
        }, 3000)
    }, [])

    return { noAssets, tickNoAssets }
}
