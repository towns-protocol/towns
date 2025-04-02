import React, { useCallback, useEffect, useMemo } from 'react'
import {
    AuthStatus,
    Permission,
    useConnectivity,
    useContractSpaceInfoWithoutClient,
    useHasMemberNft,
    useHasPermission,
    useTownsContext,
} from 'use-towns-client'
import { Box, BoxProps, FancyButton, Icon, IconProps, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { GatedTownModal } from '@components/Web3/GatedTownModal/GatedTownModal'
import { trackError } from 'hooks/useAnalytics'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { getPriceText } from '@components/TownPageLayout/townPageUtils'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { useEntitlements } from 'hooks/useEntitlements'
import { minterRoleId } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export function JoinLoginButton({
    spaceId,
    maxSupplyReached,
}: {
    spaceId: string | undefined
    maxSupplyReached: boolean
}) {
    const { isAuthenticated, loggedInWalletAddress } = useConnectivity()
    const { clientSingleton, signerContext } = useTownsContext()
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)
    const { pricingModule } = useGatherSpaceDetailsAnalytics({ spaceId })

    const {
        startJoinMeetsRequirements,
        startJoinPreLogin,
        end: endPublicPageLoginFlow,
        startJoinDoesNotMeetRequirements,
        spaceBeingJoined,
        disableJoinUi,
        assetModal,
        setAssetModal,
    } = usePublicPageLoginFlow()

    const { isTouch } = useDevice()
    const hideAssetModal = ({ shouldEndLoginFlow }: { shouldEndLoginFlow: boolean }) => {
        if (shouldEndLoginFlow) {
            endPublicPageLoginFlow()
        }
        setAssetModal(false)
    }

    const { hasPermission: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useHasPermission({
            spaceId: spaceId,
            walletAddress: loggedInWalletAddress,
            permission: Permission.JoinSpace,
        })

    const { clickedJoinTownOnTownPage: clickedJoinTown, viewedGatedTownRequirementsModal } =
        useJoinFunnelAnalytics()

    const { data: entitlements } = useEntitlements(spaceId, minterRoleId)
    const { data: membershipInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { data: hasMemberNft, isLoading: isLoadingHasMemberNft } = useHasMemberNft({
        spaceId,
    })

    const blockJoining = useMemo(() => {
        if (isLoadingHasMemberNft || hasMemberNft) {
            return false
        }
        return maxSupplyReached
    }, [hasMemberNft, isLoadingHasMemberNft, maxSupplyReached])

    const joinOrPriceText = useMemo(() => {
        if (hasMemberNft) {
            return 'Rejoin'
        }
        if (entitlements?.hasEntitlements) {
            return 'Verify Assets to Join'
        }
        if (!membershipInfo?.price) {
            return 'Join'
        }
        const price = getPriceText(membershipInfo.price, membershipInfo.remainingFreeSupply)
        return `Join for ${price?.value} ${price?.suffix}`
    }, [
        membershipInfo?.price,
        membershipInfo?.remainingFreeSupply,
        entitlements?.hasEntitlements,
        hasMemberNft,
    ])

    const onJoinClick = useCallback(
        async (getSigner: GetSigner) => {
            if (disableJoinUi) {
                return
            }
            const signer = await getSigner()

            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            clickedJoinTown({ meetsMembershipRequirements, spaceId, pricingModule })
            if (hasMemberNft || meetsMembershipRequirements) {
                startJoinMeetsRequirements({
                    signer,
                    clientSingleton,
                    signerContext,
                    source: 'public pagejoin click',
                    analyticsData: {
                        spaceName: spaceInfo?.name ?? '',
                    },
                })
            } else {
                // show asset verification modal
                viewedGatedTownRequirementsModal({
                    spaceId,
                    meetsMembershipRequirements: !!meetsMembershipRequirements,
                })
                startJoinDoesNotMeetRequirements()
            }
        },
        [
            disableJoinUi,
            clickedJoinTown,
            meetsMembershipRequirements,
            spaceId,
            pricingModule,
            startJoinMeetsRequirements,
            clientSingleton,
            signerContext,
            spaceInfo?.name,
            viewedGatedTownRequirementsModal,
            hasMemberNft,
            startJoinDoesNotMeetRequirements,
        ],
    )

    const onLoginClick = useCallback(() => {
        if (blockJoining) {
            return
        }
        clickedJoinTown({ spaceId, pricingModule })
        startJoinPreLogin()
    }, [startJoinPreLogin, blockJoining, spaceId, pricingModule, clickedJoinTown])

    const isEvaluating = useWatchEvaluatingCredentialsAuthStatus()

    const content = () => {
        if (isEvaluating) {
            return (
                <LoadingStatusMessage spinner background="level2" message="Connecting to Towns" />
            )
        }
        if (!isAuthenticated) {
            return (
                <Box width={isTouch ? undefined : '300'}>
                    <LoginComponent
                        text={
                            entitlements?.hasEntitlements ? (
                                <Box horizontal centerContent gap="sm">
                                    <Icon type="lock" size="square_xs" />
                                    {joinOrPriceText}
                                </Box>
                            ) : (
                                joinOrPriceText
                            )
                        }
                        onLoginClick={onLoginClick}
                    />
                </Box>
            )
        }

        if (isLoadingMeetsMembership) {
            return (
                <LoadingStatusMessage spinner background="level2" message="Checking membership" />
            )
        }

        return (
            <WalletReady>
                {({ getSigner }) => (
                    <Box tooltip={blockJoining ? 'No memberships left' : undefined}>
                        <FancyButton
                            cta
                            type="button"
                            disabled={disableJoinUi || blockJoining}
                            spinner={!!spaceBeingJoined}
                            onClick={() => onJoinClick(getSigner)}
                        >
                            {
                                (entitlements?.hasEntitlements && !hasMemberNft ? (
                                    <Box horizontal centerContent gap="sm">
                                        <Icon type="lock" size="square_xs" />
                                        {joinOrPriceText}
                                    </Box>
                                ) : (
                                    joinOrPriceText
                                )) as string
                            }
                        </FancyButton>
                    </Box>
                )}
            </WalletReady>
        )
    }

    return (
        <>
            {content()}

            {spaceId && assetModal && (
                <AboveAppProgressModalContainer
                    padding="none"
                    minWidth="350"
                    background="none"
                    onHide={() => hideAssetModal({ shouldEndLoginFlow: true })}
                >
                    <GatedTownModal spaceId={spaceId} onHide={hideAssetModal} />
                </AboveAppProgressModalContainer>
            )}
        </>
    )
}

function useWatchEvaluatingCredentialsAuthStatus() {
    const { authStatus } = useConnectivity()

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined
        let toastId: string | undefined
        let isCurrentEffect = true

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = undefined
            }
            if (toastId) {
                dismissToast(toastId)
                toastId = undefined
            }
        }

        if (authStatus === AuthStatus.EvaluatingCredentials) {
            timeoutId = setTimeout(() => {
                if (!isCurrentEffect) {
                    return
                }
                const message =
                    '[useWatchEvaluatingCredentialsAuthStatus] timeout connecting to Towns'
                trackError({
                    error: new Error(message),
                    category: 'river',
                    displayText: message,
                    code: 'timeout',
                    source: 'credentials auth status public page join',
                })
                toastId = popupToast(
                    ({ toast }) => (
                        <StandardToast.Error
                            message={`We're having trouble connecting with River. Please try again later.`}
                            toast={toast}
                        />
                    ),
                    {
                        duration: Infinity,
                    },
                )
            }, 10_000)
        } else {
            cleanup()
        }

        return () => {
            isCurrentEffect = false
            cleanup()
        }
    }, [authStatus])

    return authStatus === AuthStatus.EvaluatingCredentials
}
const LoadingStatusMessage = ({
    background = 'error',
    message,
    icon,
    spinner,
}: {
    background?: BoxProps['background']
    message: string
    icon?: IconProps['type']
    spinner?: boolean
}) => {
    return (
        <Box
            horizontal
            centerContent
            gap
            rounded="sm"
            background={background}
            width="100%"
            maxWidth="300"
            height="x6"
            padding="lg"
        >
            {spinner && <ButtonSpinner />}
            {icon && <Icon type={icon} />}
            <Text>{message}</Text>
        </Box>
    )
}
