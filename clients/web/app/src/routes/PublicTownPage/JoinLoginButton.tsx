import React, { useCallback, useEffect } from 'react'
import {
    AuthStatus,
    Permission,
    useConnectivity,
    useContractSpaceInfoWithoutClient,
    useHasPermission,
    useMyDefaultUsernames,
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
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export function JoinLoginButton({
    spaceId,
    maxSupplyReached,
}: {
    spaceId: string | undefined
    maxSupplyReached: boolean
}) {
    const isPreview = false
    const { isAuthenticated, loggedInWalletAddress } = useConnectivity()
    const { clientSingleton, signerContext } = useTownsContext()
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)

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

    const defaultUsername = useMyDefaultUsernames()?.[0]
    const { clickedJoinTownOnTownPage: clickedJoinTown, viewedGatedTownRequirementsModal } =
        useJoinFunnelAnalytics()

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
            clickedJoinTown({ meetsMembershipRequirements, spaceId })
            if (meetsMembershipRequirements) {
                startJoinMeetsRequirements({
                    signer,
                    clientSingleton,
                    signerContext,
                    source: 'public pagejoin click',
                    defaultUsername,
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
            startJoinMeetsRequirements,
            clientSingleton,
            signerContext,
            defaultUsername,
            spaceInfo?.name,
            viewedGatedTownRequirementsModal,
            startJoinDoesNotMeetRequirements,
        ],
    )

    const onLoginClick = useCallback(() => {
        if (maxSupplyReached) {
            return
        }
        clickedJoinTown({ spaceId })
        startJoinPreLogin()
    }, [startJoinPreLogin, maxSupplyReached, spaceId, clickedJoinTown])

    const isEvaluating = useWatchEvaluatingCredentialsAuthStatus()

    if (isPreview) {
        return
    }

    const content = () => {
        if (isEvaluating) {
            return (
                <LoadingStatusMessage spinner background="level2" message="Connecting to Towns" />
            )
        }
        if (!isAuthenticated) {
            return (
                <Box width={isTouch ? undefined : '300'}>
                    <LoginComponent text="Join" onLoginClick={onLoginClick} />
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
                    <Box tooltip={maxSupplyReached ? 'No memberships left' : undefined}>
                        <FancyButton
                            cta
                            type="button"
                            disabled={disableJoinUi || maxSupplyReached}
                            spinner={!!spaceBeingJoined}
                            onClick={() => onJoinClick(getSigner)}
                        >
                            Join
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
