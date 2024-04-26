import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Permission, useConnectivity, useHasPermission, useTownsClient } from 'use-towns-client'
import { Box, BoxProps, FancyButton, Icon, IconProps, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useJoinTown } from 'hooks/useJoinTown'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TokenVerification } from '@components/Web3/TokenVerification/TokenVerification'
import { useErrorToast } from 'hooks/useErrorToast'
import { useConnectedStatus } from './useConnectedStatus'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export function JoinLoginButton({ spaceId }: { spaceId: string | undefined }) {
    const isPreview = false
    const { client, signerContext } = useTownsClient()
    const { isAuthenticated, loggedInWalletAddress } = useConnectivity()
    const { connected, isLoading: isLoadingConnected } = useConnectedStatus()
    const {
        start: startPublicPageloginFlow,
        joiningSpace,
        end: endPublicPageLoginFlow,
    } = usePublicPageLoginFlow()

    const { isTouch } = useDevice()
    const { joinSpace, errorMessage, isNoFundsError } = useJoinTown(spaceId)
    const [isJoining, setIsJoining] = useState(false)
    const [assetModal, setAssetModal] = useState(false)
    const showAssetModal = () => setAssetModal(true)
    const hideAssetModal = () => {
        endPublicPageLoginFlow()
        setAssetModal(false)
    }

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
        preventJoinUseEffect.current = true
        startPublicPageloginFlow()
        if (meetsMembershipRequirements) {
            setIsJoining(true)
            await joinSpace()
            setIsJoining(false)
        } else {
            // show asset verification modal
            showAssetModal()
        }
    }, [isJoining, meetsMembershipRequirements, joinSpace, startPublicPageloginFlow])

    const onLoginClick = useCallback(() => {
        startPublicPageloginFlow()
    }, [startPublicPageloginFlow])

    useErrorToast({ errorMessage: isNoFundsError ? undefined : errorMessage })

    useEffect(() => {
        // if widnow has join param and user is authenticated and has an embedded wallet
        if (
            !preventJoinUseEffect.current &&
            !!joiningSpace &&
            signerContext &&
            isAuthenticated &&
            connected
        ) {
            preventJoinUseEffect.current = true
            onJoinClick()
        }
    }, [isAuthenticated, connected, onJoinClick, joiningSpace, client, signerContext])

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

        if (isLoadingConnected) {
            return <LoadingStatusMessage spinner background="lightHover" message="Loading wallet" />
        }

        if (connected) {
            if (isLoadingMeetsMembership) {
                return (
                    <LoadingStatusMessage
                        spinner
                        background="level3"
                        message="Checking requirements"
                    />
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

        return <ButtonSpinner />
    }

    return (
        <>
            {content()}

            {spaceId && assetModal && (
                <ModalContainer padding="none" minWidth="350" onHide={hideAssetModal}>
                    <TokenVerification spaceId={spaceId} onHide={hideAssetModal} />
                </ModalContainer>
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
