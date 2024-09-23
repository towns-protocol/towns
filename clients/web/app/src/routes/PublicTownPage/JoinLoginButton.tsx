import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Permission, useConnectivity, useHasPermission, useTownsClient } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Box, BoxProps, FancyButton, Icon, IconProps, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useJoinTown } from 'hooks/useJoinTown'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { TokenVerification } from '@components/Web3/TokenVerification/TokenVerification'
import { useErrorToast } from 'hooks/useErrorToast'
import { Analytics } from 'hooks/useAnalytics'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export function JoinLoginButton({ spaceId }: { spaceId: string | undefined }) {
    const isPreview = false
    const { client, signerContext } = useTownsClient()
    const { isAuthenticated, loggedInWalletAddress } = useConnectivity()
    const { isConnected: connected } = useCombinedAuth()
    const { getSigner } = useGetEmbeddedSigner()

    const { start: startPublicPageloginFlow, joiningSpace } = usePublicPageLoginFlow()

    const { isTouch } = useDevice()
    const { joinSpace, errorMessage, isNoFundsError } = useJoinTown(spaceId)
    const [isJoining, setIsJoining] = useState(false)
    const [assetModal, setAssetModal] = useState(false)
    const showAssetModal = () => setAssetModal(true)
    const hideAssetModal = () => {
        setAssetModal(false)
    }
    const { addTownNotificationSettings } = useNotificationSettings()

    const preventJoinUseEffect = useRef(false)

    const { hasPermission: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useHasPermission({
            spaceId: spaceId,
            walletAddress: loggedInWalletAddress,
            permission: Permission.JoinSpace,
        })

    const onJoinClick = useCallback(async () => {
        if (isJoining) {
            return
        }
        const signer = await getSigner()

        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        Analytics.getInstance().track(
            'Clicked join town on town page',
            {
                spaceId,
                meetsMembershipRequirements,
            },
            () => {
                console.log('[analytics][JoinLoginButton] Clicked join town on town page')
            },
        )
        preventJoinUseEffect.current = true
        startPublicPageloginFlow()
        if (meetsMembershipRequirements) {
            setIsJoining(true)
            await joinSpace()
            spaceId && (await addTownNotificationSettings(spaceId))
            setIsJoining(false)
        } else {
            // show asset verification modal
            Analytics.getInstance().page('requirements-modal', 'view gated requirements modal', {
                spaceId,
                meetsMembershipRequirements,
            })
            showAssetModal()
        }
    }, [
        isJoining,
        getSigner,
        spaceId,
        startPublicPageloginFlow,
        meetsMembershipRequirements,
        joinSpace,
        addTownNotificationSettings,
    ])

    const onLoginClick = useCallback(() => {
        startPublicPageloginFlow()
    }, [startPublicPageloginFlow])

    useErrorToast({ errorMessage: isNoFundsError ? undefined : errorMessage })

    useEffect(() => {
        // if widnow has join param and user is authenticated and has an embedded wallet
        if (
            !preventJoinUseEffect.current &&
            !isLoadingMeetsMembership &&
            !!joiningSpace &&
            signerContext &&
            isAuthenticated &&
            connected
        ) {
            preventJoinUseEffect.current = true
            onJoinClick()
        }
    }, [
        isAuthenticated,
        connected,
        onJoinClick,
        joiningSpace,
        client,
        signerContext,
        isLoadingMeetsMembership,
    ])

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
                disabled={isJoining}
                spinner={isJoining}
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
                    onHide={hideAssetModal}
                >
                    <TokenVerification
                        spaceId={spaceId}
                        joinSpace={joinSpace}
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
