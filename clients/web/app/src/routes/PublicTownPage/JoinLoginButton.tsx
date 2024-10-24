import React, { useCallback, useEffect } from 'react'
import {
    AuthStatus,
    Permission,
    useConnectivity,
    useHasPermission,
    useMyDefaultUsernames,
    useTownsContext,
} from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Box, BoxProps, FancyButton, Icon, IconProps, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { GatedTownModal } from '@components/Web3/GatedTownModal/GatedTownModal'
import { Analytics, trackError } from 'hooks/useAnalytics'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export function JoinLoginButton({ spaceId }: { spaceId: string | undefined }) {
    const isPreview = false
    const { isAuthenticated, loggedInWalletAddress } = useConnectivity()
    const { getSigner } = useGetEmbeddedSigner()
    const { clientSingleton, signerContext } = useTownsContext()

    const {
        startJoinMeetsRequirements,
        startJoinPreLogin,
        joinTown,
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

    const onJoinClick = useCallback(async () => {
        if (disableJoinUi) {
            return
        }
        const signer = await getSigner()

        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        Analytics.getInstance().track('clicked join town on town page', {
            spaceId,
            meetsMembershipRequirements,
        })
        if (meetsMembershipRequirements) {
            startJoinMeetsRequirements({
                signer,
                clientSingleton,
                signerContext,
                source: 'public pagejoin click',
                defaultUsername,
            })
        } else {
            // show asset verification modal
            Analytics.getInstance().page(
                'requirements-modal',
                'viewed gated town requirements modal',
                {
                    spaceId,
                    meetsMembershipRequirements,
                },
            )
            startJoinDoesNotMeetRequirements()
        }
    }, [
        disableJoinUi,
        getSigner,
        spaceId,
        meetsMembershipRequirements,
        startJoinMeetsRequirements,
        clientSingleton,
        signerContext,
        defaultUsername,
        startJoinDoesNotMeetRequirements,
    ])

    const onTokenVerificationJoinClick = useCallback(async () => {
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
        })
    }, [getSigner, joinTown, clientSingleton, signerContext])

    const onLoginClick = useCallback(() => {
        startJoinPreLogin()
    }, [startJoinPreLogin])

    const isEvaluating = useWatchEvaluatingCredentialsAuthStatus()

    if (isPreview) {
        return
    }

    const content = () => {
        if (isEvaluating) {
            return (
                <LoadingStatusMessage spinner background="level2" message="Connecting to River" />
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

        Analytics.getInstance().trackOnce('join button shown', {
            spaceId,
            meetsMembershipRequirements,
        })

        return (
            <FancyButton
                cta
                type="button"
                disabled={disableJoinUi}
                spinner={!!spaceBeingJoined}
                onClick={onJoinClick}
            >
                Join
            </FancyButton>
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
                    <GatedTownModal
                        spaceId={spaceId}
                        joinSpace={onTokenVerificationJoinClick}
                        onHide={hideAssetModal}
                    />
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

        if (authStatus === AuthStatus.EvaluatingCredentials) {
            timeoutId = setTimeout(() => {
                const message =
                    '[useWatchEvaluatingCredentialsAuthStatus] timeout connecting to River'
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
            if (toastId) {
                dismissToast(toastId)
            }
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
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
