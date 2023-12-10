import debug from 'debug'
import React, { Suspense, useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import { useMyProfile } from 'use-zion-client'
import { isAddress } from 'viem'

import { Allotment } from 'allotment'
import { Avatar } from '@components/Avatar/Avatar'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ErrorReportModal } from '@components/ErrorReport/ErrorReport'
import { PageLogo } from '@components/Logo/Logo'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { Activity } from '@components/TownPageLayout/TownPageActivity'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { FadeInBox } from '@components/Transitions'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { NoFundsModal } from '@components/VisualViewportContext/NoFundsModal'
import { BottomBarLayout } from '@components/Web3/MembershipNFT/BottomBar'
import { Box, BoxProps, Button, Card, Heading, Icon, IconProps, Paragraph, Stack, Text } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { useDevice } from 'hooks/useDevice'
import { useErrorToast } from 'hooks/useErrorToast'
import { useJoinTown } from 'hooks/useJoinTown'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { useMeetsMembershipNftRequirements } from 'hooks/useTokensGatingMembership'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { shortAddress } from 'ui/utils/utils'
import { MainSideBar } from '@components/SideBars'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const log = debug('app:public-town')
log.enabled = true

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const PublicTownPage = () => {
    const { spaceSlug } = useParams()
    // TEMPORARY joining state until hook is built for minting
    const [isJoining, setIsJoining] = useState(false)

    const { data: spaceInfo, isLoading } = useContractSpaceInfo(spaceSlug)
    const { data: townBio } = useGetSpaceTopic(spaceSlug)
    const { isConnected, isAuthenticatedAndConnected, isSignerReady } = useAuth()

    const { data: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useMeetsMembershipNftRequirements(spaceInfo?.networkId, isConnected)
    const { joinSpace, errorMessage, isNoFundsError, clearErrors } = useJoinTown(
        spaceInfo?.networkId,
    )

    const onJoinClick = useCallback(async () => {
        setIsJoining(true)
        await joinSpace()
        setIsJoining(false)
    }, [joinSpace])

    const { isTouch } = useDevice()

    useErrorToast({ errorMessage: isNoFundsError ? undefined : errorMessage })

    return spaceInfo ? (
        <>
            <AbsoluteBackground networkId={spaceInfo.networkId} />
            <Box height="100dvh" paddingTop="safeAreaInsetTop">
                <TownPageLayout
                    headerContent={
                        <Box horizontal centerContent width="100%" padding="lg">
                            <Box
                                horizontal
                                width="wide"
                                justifyContent="spaceBetween"
                                paddingY="md"
                            >
                                <PageLogo />
                                <LoggedUserAvatar />
                            </Box>
                        </Box>
                    }
                    activityContent={<Activity townId={spaceInfo.networkId} />}
                    bottomContent={
                        <BottomBarLayout
                            position="fixed"
                            bottom="none"
                            zIndex="above"
                            errorReportButton={<ErrorReportModal minimal={isTouch} />}
                            buttonContent={
                                <Box grow>
                                    {isAuthenticatedAndConnected ? (
                                        isLoadingMeetsMembership || !isSignerReady ? (
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
                                        <Suspense>
                                            <LoginComponent />
                                        </Suspense>
                                    )}
                                </Box>
                            }
                        />
                    }
                    networkId={spaceInfo.networkId}
                    address={isAddress(spaceInfo.address) ? spaceInfo.address : undefined}
                    name={spaceInfo.name}
                    owner={isAddress(spaceInfo.owner) ? spaceInfo.owner : undefined}
                    bio={townBio}
                />
            </Box>
            {isNoFundsError && (
                <ModalContainer padding="none" minWidth="350" onHide={clearErrors}>
                    <NoFundsModal onHide={clearErrors} />
                </ModalContainer>
            )}
        </>
    ) : isLoading ? (
        <WelcomeLayout debugText="fetching town data" />
    ) : isConnected ? (
        <Stack horizontal absoluteFill>
            <Allotment>
                <Allotment.Pane minSize={65} maxSize={65} preferredSize={65}>
                    <MainSideBar />
                </Allotment.Pane>
                <Allotment.Pane>
                    <Box absoluteFill centerContent>
                        <TownNotFoundBox />
                    </Box>
                </Allotment.Pane>
            </Allotment>
            )
        </Stack>
    ) : (
        <MessageBox>
            <TownNotFoundBox />
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
    // Other authed routes are behind isAuthenticatedAndConnected
    // but b/c this page is for both public and authed users, there are edge cases where a user might have profile data
    // but some other condition for them to be authed is not met (like the signer is not set)
    // so we should check for this too to avoid misleading UI
    const { isAuthenticatedAndConnected } = useAuth()

    if (!isAuthenticatedAndConnected || !profileUser) {
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

export const TownNotFoundBox = () => (
    <FadeInBox centerContent gap="lg" maxWidth="400">
        <Box padding background="error" borderRadius="sm">
            <Icon color="default" type="alert" size="square_md" />
        </Box>
        <Heading level={3}>Town not found</Heading>
        <Paragraph color="gray2" textAlign="center">
            The town is currently unreachable, please try again later.
        </Paragraph>
        <Box>
            <Link to="/">
                <Button size="button_md">Back to login</Button>
            </Link>
        </Box>
    </FadeInBox>
)
