import React, { useCallback } from 'react'
import { Permission, useConnectivity, useHasPermission, useTownsContext } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Box, BoxProps, FancyButton, Icon, IconProps, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { GatedTownModal } from '@components/Web3/GatedTownModal/GatedTownModal'
import { Analytics } from 'hooks/useAnalytics'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
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
            })
        } else {
            // show asset verification modal
            Analytics.getInstance().page('requirements-modal', 'view gated requirements modal', {
                spaceId,
                meetsMembershipRequirements,
            })
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
        })
    }, [getSigner, joinTown, clientSingleton, signerContext])

    const onLoginClick = useCallback(() => {
        startJoinPreLogin()
    }, [startJoinPreLogin])

    if (isPreview) {
        return
    }

    const content = () => {
        if (!isAuthenticated) {
            return (
                <Box width={isTouch ? undefined : '300'}>
                    <LoginComponent text="Join" onLoginClick={onLoginClick} />
                </Box>
            )
        }

        if (isLoadingMeetsMembership) {
            return (
                <LoadingStatusMessage spinner background="level3" message="Checking requirements" />
            )
        }

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
