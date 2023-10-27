import debug from 'debug'
import React, { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMyProfile } from 'use-zion-client'
import { isAddress } from 'viem'
import { LoginComponent } from '@components/Login/LoginComponent'
import { PageLogo } from '@components/Logo/Logo'
import { Spinner } from '@components/Spinner'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { Activity } from '@components/TownPageLayout/TownPageActivity'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { BottomBarLayout } from '@components/Web3/MembershipNFT/BottomBar'
import {
    Avatar,
    Box,
    BoxProps,
    Button,
    Card,
    Heading,
    Icon,
    IconProps,
    Paragraph,
    Stack,
    Text,
} from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useJoinTown } from 'hooks/useJoinTown'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { useMeetsMembershipNftRequirements } from 'hooks/useTokensGatingMembership'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useErrorToast } from 'hooks/useErrorToast'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'

const log = debug('app:public-town')
log.enabled = true

export const PublicTownPage = () => {
    const { spaceSlug } = useParams()
    // TEMPORARY joining state until hook is built for minting
    const [isJoining, setIsJoining] = useState(false)

    const { data: spaceInfo, isLoading } = useContractSpaceInfo(spaceSlug)
    const { data: townBio } = useGetSpaceTopic(spaceSlug)
    const { isConnected, isAuthenticatedAndConnected } = useAuth()

    const { data: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useMeetsMembershipNftRequirements(spaceInfo?.networkId, isConnected)
    const { joinSpace, errorMessage } = useJoinTown(spaceInfo?.networkId)

    const onJoinClick = useCallback(async () => {
        setIsJoining(true)
        await joinSpace()
        setIsJoining(false)
    }, [joinSpace])

    useErrorToast({ errorMessage })

    return spaceInfo ? (
        <>
            <AbsoluteBackground networkId={spaceInfo.networkId} />
            <Box horizontal centerContent width="100%" padding="lg">
                <Box horizontal width="wide" justifyContent="spaceBetween">
                    <PageLogo />
                    <LoggedUserAvatar />
                </Box>
            </Box>
            <TownPageLayout
                activityContent={<Activity townId={spaceInfo.networkId} />}
                bottomContent={
                    <BottomBarLayout
                        buttonContent={
                            isAuthenticatedAndConnected ? (
                                isLoadingMeetsMembership ? (
                                    <MembershipStatusMessage
                                        spinner
                                        background="level3"
                                        message="Checking requirements"
                                    />
                                ) : meetsMembershipRequirements ? (
                                    <Button
                                        tone="cta1"
                                        width="100%"
                                        type="button"
                                        disabled={isJoining}
                                        onClick={onJoinClick}
                                    >
                                        {isJoining && <ButtonSpinner />}
                                        Join {spaceInfo.name}
                                    </Button>
                                ) : (
                                    <MembershipStatusMessage
                                        background="error"
                                        icon="alert"
                                        message={`You don't have the required digital assets to join this town.`}
                                    />
                                )
                            ) : (
                                <LoginComponent />
                            )
                        }
                    />
                }
                networkId={spaceInfo.networkId}
                address={isAddress(spaceInfo.address) ? spaceInfo.address : undefined}
                name={spaceInfo.name}
                owner={isAddress(spaceInfo.owner) ? spaceInfo.owner : undefined}
                bio={townBio}
            />
        </>
    ) : isLoading ? (
        <MessageBox>
            <Spinner />
            <Heading level={4}>Fetching town data</Heading>
        </MessageBox>
    ) : (
        <MessageBox color="error">
            <Icon type="alert" />
            <Heading level={4}>Town not found</Heading>
        </MessageBox>
    )
}

export const AbsoluteBackground = ({ networkId }: { networkId: string }) => {
    const { imageSrc } = useImageSource(networkId, ImageVariants.thumbnail600)
    return (
        <Box absoluteFill pointerEvents="none">
            <BlurredBackground imageSrc={imageSrc ?? ''} blur={40} />
        </Box>
    )
}

const MembershipStatusMessage = ({
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

const MessageBox = ({ children, ...boxProps }: BoxProps) => (
    <Box absoluteFill centerContent {...boxProps}>
        <Box gap centerContent textAlign="center">
            {children}
        </Box>
    </Box>
)

const LoggedUserAvatar = () => {
    const profileUser = useMyProfile()

    if (!profileUser) {
        return
    }

    return (
        <Box
            hoverable
            cursor="pointer"
            tooltip={<LoggedUserMenu />}
            tooltipOptions={{
                placement: 'vertical',
                trigger: 'click',
                align: 'end',
            }}
        >
            <Avatar size="avatar_x4" userId={profileUser.userId} src={profileUser.avatarUrl} />
        </Box>
    )
}

const LoggedUserMenu = () => {
    const { logout, loggedInWalletAddress } = useAuth()
    const onLogOut = useCallback(() => {
        logout()
    }, [logout])

    const navigate = useNavigate()
    const onBackToApp = useCallback(() => {
        navigate('/')
    }, [navigate])

    return (
        <Card border minWidth="250" pointerEvents="all">
            <Stack
                horizontal
                gap
                padding
                hoverable
                cursor="pointer"
                alignItems="center"
                paddingBottom="sm"
                background="level2"
                onClick={onBackToApp}
            >
                <Icon background="level3" type="arrowLeft" padding="sm" size="square_lg" />
                <Paragraph>Back to App</Paragraph>
            </Stack>
            {loggedInWalletAddress && (
                <Stack
                    horizontal
                    gap
                    padding
                    hoverable
                    alignItems="center"
                    paddingY="sm"
                    background="level2"
                >
                    <Icon background="level3" type="wallet" padding="sm" size="square_lg" />

                    <ClipboardCopy
                        color="none"
                        label={shortAddress(loggedInWalletAddress)}
                        clipboardContent={loggedInWalletAddress}
                    />
                </Stack>
            )}
            <Stack
                padding
                horizontal
                gap
                hoverable
                paddingTop="sm"
                background="level2"
                alignItems="center"
                color="error"
                cursor="pointer"
                onClick={onLogOut}
            >
                <Icon
                    background="level3"
                    type="logout"
                    padding="sm"
                    size="square_lg"
                    color="inherit"
                />
                <Paragraph>Log Out</Paragraph>
            </Stack>
        </Card>
    )
}
