import React, { PropsWithChildren, useCallback, useMemo, useState } from 'react'
import {
    Address,
    BlockchainTransactionType,
    Permission,
    useConnectivity,
    useContractSpaceInfoWithoutClient,
    useHasPermission,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useTownsContext,
} from 'use-towns-client'
import { Button, IconButton, MotionBox, Paragraph, Stack, Text } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { Entitlements, useEntitlements } from 'hooks/useEntitlements'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Analytics } from 'hooks/useAnalytics'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { TokenSelectionDisplay } from '@components/Tokens/TokenSelector/TokenSelection'
import { useNativeTokenWithQuantity } from '@components/Tokens/utils'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { minterRoleId } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { FullPanelOverlay, LinkedWallet } from '../WalletLinkingPanel'
import { isEveryoneAddress, mapToErrorMessage } from '../utils'
import { ConnectWalletThenLinkButton } from '../ConnectWallet/ConnectWalletThenLinkButton'
import { WalletLinkingInfo } from '../WalletLinkingInfo'

type Props = {
    onHide: ({ shouldEndLoginFlow }: { shouldEndLoginFlow: boolean }) => void
    spaceId: string
}

export function GatedTownModal({ onHide, spaceId }: Props) {
    const { data: linkedWallets } = useLinkedWallets()
    const { data: entitlements } = useEntitlements(spaceId, minterRoleId)
    const tokensLength = entitlements?.tokens.length ?? 0
    const maxWidth = tokensLength > 2 ? 'auto' : '400'
    const { data: aaAddress } = useMyAbstractAccountAddress()

    const isTokenGated = useMemo(() => entitlements?.tokens.length > 0, [entitlements])
    const isUserGated = useMemo(
        () => entitlements?.users.some((user) => !isEveryoneAddress(user)),
        [entitlements],
    )

    const isWalletUnLinkingPending = useIsTransactionPending(BlockchainTransactionType.UnlinkWallet)

    return (
        <Stack position="relative" padding="lg" paddingTop="md" maxWidth={maxWidth} overflow="auto">
            <Stack alignItems="end">
                <IconButton icon="close" onClick={() => onHide({ shouldEndLoginFlow: true })} />
            </Stack>
            <Stack gap alignItems="center">
                <Text strong size="lg">
                    Town gated
                </Text>
                {isTokenGated && isUserGated ? (
                    <Text color="gray1">{`You must be in the allow list or hold any of the following tokens to claim membership:`}</Text>
                ) : isTokenGated ? (
                    <Text color="gray1">{`Any of the following tokens must be held to claim membership:`}</Text>
                ) : isUserGated ? (
                    <Text color="gray1">{`You must be in the allow list to join this town.`}</Text>
                ) : null}

                <Content
                    linkedWallets={linkedWallets}
                    entitlements={entitlements}
                    onHide={(
                        params: { shouldEndLoginFlow: boolean } = { shouldEndLoginFlow: true },
                    ) => onHide(params)}
                >
                    {linkedWallets && linkedWallets.length > 1 ? (
                        <Paragraph strong>Linked Wallets</Paragraph>
                    ) : null}
                    {linkedWallets !== undefined &&
                        linkedWallets
                            // exclude showing the aaAddress in the list of linked wallets for digital asset requirement
                            // we don't want users sending assets here
                            .filter((a) => a !== aaAddress)
                            .map((a) => {
                                return (
                                    <Stack width="100%" key={a}>
                                        <LinkedWallet
                                            height="x7"
                                            address={a as Address}
                                            aaAddress={aaAddress ?? '0x'}
                                        />
                                    </Stack>
                                )
                            })}
                </Content>

                {isWalletUnLinkingPending && <FullPanelOverlay text="Unlinking Wallet" />}
            </Stack>
        </Stack>
    )
}

function Content({
    entitlements,
    linkedWallets,
    children,
    onHide,
}: PropsWithChildren<
    {
        linkedWallets: string[] | undefined
        entitlements: Entitlements
    } & Omit<Props, 'spaceId'>
>) {
    const { loggedInWalletAddress } = useConnectivity()
    const spaceId = useSpaceIdFromPathname()
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)
    const { clickedJoinTownOnGatedTownRequirementsModal, successfullyLinkedWallet } =
        useJoinFunnelAnalytics()
    const {
        hasPermission: meetsMembershipRequirements,
        isLoading: isLoadingMeetsMembership,
        invalidate: invalidateJoinSpace,
        getQueryData: getJoinSpaceQueryData,
    } = useHasPermission({
        spaceId,
        walletAddress: loggedInWalletAddress,
        permission: Permission.JoinSpace,
    })

    const { noAssets, tickNoAssets } = useNoAssetsState()
    const isJoinPending = useIsTransactionPending(BlockchainTransactionType.JoinSpace)
    const { baseChain } = useEnvironment()
    const { clientSingleton, signerContext } = useTownsContext()

    const { joinTown } = usePublicPageLoginFlow()

    const onTokenVerificationJoinClick = useCallback(
        async (getSigner: GetSigner) => {
            onHide({ shouldEndLoginFlow: false })

            Analytics.getInstance().track('clicked join town on link wallet modal', {
                spaceId,
            })
            clickedJoinTownOnGatedTownRequirementsModal({ spaceId })

            const signer = await getSigner()

            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            joinTown({
                signer,
                clientSingleton,
                signerContext,
                source: 'token verification click',
                analyticsData: {
                    spaceName: spaceInfo?.name ?? '',
                },
            })
        },
        [
            onHide,
            spaceId,
            clickedJoinTownOnGatedTownRequirementsModal,
            joinTown,
            clientSingleton,
            signerContext,
            spaceInfo?.name,
        ],
    )

    const nativeTokenWithQuantity = useNativeTokenWithQuantity(entitlements?.ethBalance || '')

    const { isLoading: isLoadingLinkingWallet, linkEOAToRootKeyTransaction } =
        useLinkEOAToRootKeyTransaction({
            onSuccess: async () => {
                if (!loggedInWalletAddress) {
                    return
                }
                await invalidateJoinSpace()

                const canJoin = getJoinSpaceQueryData()

                successfullyLinkedWallet({ spaceId, meetsMembershipRequirements: !!canJoin })

                if (!canJoin) {
                    tickNoAssets()
                }
            },
            onError: async (error) => {
                console.error('[useLinkEOAToRootKeyTransaction] error linking wallet', error)
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message={`There was an error linking your wallet. Make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                        subMessage={mapToErrorMessage({
                            error,
                            source: 'token verification link wallet',
                        })}
                    />
                ))
            },
        })

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
                {nativeTokenWithQuantity && (
                    <TokenSelectionDisplay elevate token={nativeTokenWithQuantity} />
                )}
                {entitlements.tokens.map((token) => (
                    <TokenSelectionDisplay
                        elevate
                        key={token.chainId + token.data.address + (token.data.tokenId ?? '')}
                        token={token}
                        userPassesEntitlement={
                            meetsMembershipRequirements !== undefined && meetsMembershipRequirements
                        }
                    />
                ))}
            </Stack>

            {meetsMembershipRequirements ? (
                <WalletReady>
                    {({ getSigner }) => (
                        <Button
                            disabled={isJoinPending}
                            tone="cta1"
                            width="100%"
                            type="button"
                            onClick={() => onTokenVerificationJoinClick(getSigner)}
                        >
                            Join
                        </Button>
                    )}
                </WalletReady>
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

                    <ConnectWalletThenLinkButton
                        tone="cta1"
                        width="100%"
                        buttonText="Link a wallet"
                        onLinkWallet={linkEOAToRootKeyTransaction}
                    />

                    <WalletLinkingInfo />

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
