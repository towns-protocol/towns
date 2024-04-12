import React, { useCallback, useMemo, useState } from 'react'
import {
    BlockchainTransactionType,
    Permission,
    useConnectivity,
    useHasPermission,
    useIsTransactionPending,
    useMembershipInfo,
} from 'use-towns-client'
import { ethers } from 'ethers'
import { Box, BoxProps, FancyButton, Icon, IconProps, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useJoinTown } from 'hooks/useJoinTown'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TokenVerification } from '@components/Web3/TokenVerification/TokenVerification'
import { useErrorToast } from 'hooks/useErrorToast'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useConnectedStatus } from './useConnectedStatus'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export function JoinLoginButton({ spaceId }: { spaceId: string | undefined }) {
    const isPreview = false
    const { isAuthenticated, loggedInWalletAddress } = useConnectivity()
    const { connected, isLoading: isLoadingConnected } = useConnectedStatus()

    const { isTouch } = useDevice()
    const { joinSpace, errorMessage, isNoFundsError } = useJoinTown(spaceId)
    const [isJoining, setIsJoining] = useState(false)
    const [assetModal, setAssetModal] = useState(false)
    const showAssetModal = () => setAssetModal(true)
    const hideAssetModal = () => setAssetModal(false)
    const {
        price: membershipPriceInWei,
        isLoading: isLoadingMembershipPrice,
        error: membershipPriceError,
    } = useMembershipPriceInWei()

    const { hasPermission: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useHasPermission({
            spaceId: spaceId,
            walletAddress: loggedInWalletAddress,
            permission: Permission.JoinSpace,
        })

    const onJoinClick = useCallback(async () => {
        if (meetsMembershipRequirements) {
            setIsJoining(true)
            await joinSpace()
            setIsJoining(false)
        } else {
            // show asset verification modal
            showAssetModal()
        }
    }, [meetsMembershipRequirements, joinSpace])

    useErrorToast({ errorMessage: isNoFundsError ? undefined : errorMessage })

    if (isPreview) {
        return
    }

    const content = () => {
        if (!isAuthenticated) {
            return (
                <Box width={isTouch ? undefined : '300'}>
                    <LoginComponent text="Join" />
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

            <UserOpTxModal
                membershipPrice={membershipPriceInWei}
                isLoadingMembershipPrice={isLoadingMembershipPrice}
                membershipPriceError={membershipPriceError}
            />
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

function useMembershipPriceInWei() {
    const spaceId = useSpaceIdFromPathname()

    const {
        data: membershipInfo,
        isLoading: isLoadingMembershipInfo,
        error,
    } = useMembershipInfo(spaceId ?? '')
    const isJoinPending = useIsTransactionPending(BlockchainTransactionType.JoinSpace)

    return useMemo(() => {
        if (!isJoinPending) {
            return { price: undefined, isLoading: false, error }
        }
        if (isLoadingMembershipInfo) {
            return { price: undefined, isLoading: true, error }
        }
        if (!membershipInfo) {
            return { price: undefined, isLoading: false, error }
        }
        return {
            price: ethers.BigNumber.from(membershipInfo.price).toBigInt(),
            isLoading: false,
            error,
        }
    }, [isJoinPending, isLoadingMembershipInfo, membershipInfo, error])
}
