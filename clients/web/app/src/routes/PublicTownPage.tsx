import debug from 'debug'
import React, { Suspense, useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Link } from 'react-router-dom'
import { Permission, useContractSpaceInfo, useHasPermission, useMyProfile } from 'use-towns-client'
import { isAddress } from 'viem'

import { Allotment } from 'allotment'
import { clsx } from 'clsx'
import { TokenVerification } from '@components/Web3/TokenVerification/TokenVerification'
import { Avatar } from '@components/Avatar/Avatar'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'

import { LogoSingleLetter } from '@components/Logo/Logo'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { TownPageActivity } from '@components/TownPageLayout/TownPageActivity'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { FadeInBox } from '@components/Transitions'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { BottomBarLayout } from '@components/Web3/MembershipNFT/BottomBar'
import {
    Box,
    BoxProps,
    Button,
    Heading,
    Icon,
    IconButton,
    IconProps,
    Paragraph,
    Stack,
    Text,
} from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useErrorToast } from 'hooks/useErrorToast'
import { useJoinTown } from 'hooks/useJoinTown'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { shortAddress } from 'ui/utils/utils'
import { MainSideBar } from '@components/SideBars'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { useDevice } from 'hooks/useDevice'
import { atoms } from 'ui/styles/atoms.css'
import { darkTheme } from 'ui/styles/vars.css'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const log = debug('app:public-town')
log.enabled = true

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const PublicTownPage = (props: { isPreview?: boolean; onClosePreview?: () => void }) => {
    const { isPreview = false, onClosePreview } = props
    const { spaceSlug } = useParams()
    // TEMPORARY joining state until hook is built for minting
    const [isJoining, setIsJoining] = useState(false)
    const { isConnected, loggedInWalletAddress } = useAuth()
    const { data: spaceInfo, isLoading } = useContractSpaceInfo(spaceSlug)
    const { data: townBio } = useGetSpaceTopic(spaceSlug)
    const { data: membershipInfo } = useReadableMembershipInfo(spaceInfo?.networkId ?? '')

    const { isAuthenticatedAndConnected } = useAuth()
    const [assetModal, setAssetModal] = useState(false)
    const showAssetModal = () => setAssetModal(true)
    const hideAssetModal = () => setAssetModal(false)

    const { hasPermission: meetsMembershipRequirements, isLoading: isLoadingMeetsMembership } =
        useHasPermission({
            spaceId: spaceInfo?.networkId,
            walletAddress: loggedInWalletAddress,
            permission: Permission.JoinSpace,
        })
    const { joinSpace, errorMessage, isNoFundsError } = useJoinTown(spaceInfo?.networkId)

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

    const className = clsx([
        darkTheme,
        atoms({ color: 'default' }),
        atoms({ background: 'default' }),
    ])

    return spaceInfo ? (
        <>
            <AbsoluteBackground networkId={spaceInfo.networkId} />
            <Box absoluteFill paddingTop="safeAreaInsetTop" className={className}>
                <TownPageLayout
                    headerContent={
                        <Header
                            isConnected={isConnected}
                            isPreview={isPreview}
                            onClosePreview={onClosePreview}
                        />
                    }
                    activityContent={<TownPageActivity townId={spaceInfo.networkId} />}
                    isPreview={isPreview}
                    bottomContent={
                        <Footer
                            isPreview={isPreview}
                            isJoining={isJoining}
                            isAuthenticatedAndConnected={isAuthenticatedAndConnected}
                            isLoadingMeetsMembership={isLoadingMeetsMembership}
                            totalSupply={membershipInfo?.totalSupply}
                            maxSupply={membershipInfo?.maxSupply}
                            onJoinClick={onJoinClick}
                        />
                    }
                    spaceId={spaceInfo.networkId}
                    address={isAddress(spaceInfo.address) ? spaceInfo.address : undefined}
                    name={spaceInfo.name}
                    owner={isAddress(spaceInfo.owner) ? spaceInfo.owner : undefined}
                    bio={townBio}
                />
            </Box>

            {assetModal && (
                <ModalContainer padding="none" minWidth="350" onHide={hideAssetModal}>
                    <TokenVerification spaceId={spaceInfo.networkId} onHide={hideAssetModal} />
                </ModalContainer>
            )}

            <UserOpTxModal />
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

const Header = (props: {
    isConnected: boolean
    isPreview: boolean
    onClosePreview?: () => void
}) => {
    const { isConnected, isPreview, onClosePreview } = props
    const [isShowingBugReport, setIsShowingBugReport] = useState(false)
    const onShowBugReport = useCallback(() => {
        setIsShowingBugReport(true)
    }, [setIsShowingBugReport])

    const onHideBugReport = useCallback(() => {
        setIsShowingBugReport(false)
    }, [setIsShowingBugReport])
    const { login } = useAuth()

    return (
        <Box horizontal centerContent width="100%" position="absolute" top="none">
            <Stack horizontal width="100%" paddingY="md" gap="md" paddingRight="md">
                <Link to="/">
                    <Box centerContent width="x8">
                        <LogoSingleLetter />
                    </Box>
                </Link>
                <Box grow />
                {isPreview ? (
                    <IconButton hoverable icon="close" color="default" onClick={onClosePreview} />
                ) : (
                    <>
                        <Box
                            hoverable
                            centerContent
                            cursor="pointer"
                            tooltip="Report a bug"
                            tooltipOptions={{ placement: 'horizontal' }}
                            padding="line"
                            background="level2"
                            rounded="sm"
                            height="x4"
                            width="x4"
                            onClick={onShowBugReport}
                        >
                            <Icon size="square_sm" type="bug" color="default" />
                        </Box>

                        {isConnected ? (
                            <LoggedUserAvatar />
                        ) : (
                            <Button tone="level2" color="default" size="button_sm" onClick={login}>
                                Log In
                            </Button>
                        )}
                    </>
                )}
            </Stack>
            {isShowingBugReport && (
                <ModalContainer onHide={onHideBugReport}>
                    <ErrorReportForm onHide={onHideBugReport} />
                </ModalContainer>
            )}
        </Box>
    )
}

const Footer = (props: {
    isPreview?: boolean
    isAuthenticatedAndConnected: boolean
    isLoadingMeetsMembership: boolean
    isJoining: boolean
    totalSupply?: number
    maxSupply?: number
    onJoinClick: () => void
}) => {
    const {
        isPreview,
        isAuthenticatedAndConnected,
        isLoadingMeetsMembership,
        isJoining,
        onJoinClick,
        totalSupply,
        maxSupply,
    } = props

    const { isTouch } = useDevice()
    const percentageFilled = useMemo(() => {
        if (!totalSupply || !maxSupply) {
            return 0
        }
        // always show a tiny bit of the progress bar
        return Math.max((maxSupply - totalSupply) / maxSupply, 0.02)
    }, [totalSupply, maxSupply])

    const membershipSupplyText = useMemo(() => {
        if (!totalSupply || !maxSupply) {
            return undefined
        }
        return `${maxSupply - totalSupply}/${maxSupply}`
    }, [totalSupply, maxSupply])
    return (
        <BottomBarLayout
            position="fixed"
            bottom="none"
            zIndex="above"
            messageContent={
                <Stack
                    grow
                    centerContent
                    gap={isTouch ? 'sm' : 'md'}
                    color="default"
                    paddingTop="sm"
                >
                    {totalSupply && maxSupply && (
                        <>
                            <Stack horizontal={!isTouch} width="100%" gap="sm">
                                <Text fontWeight="strong" fontSize={isTouch ? 'sm' : 'lg'}>
                                    Memberships left
                                </Text>
                                {!isTouch && <Box grow />}
                                <Text color="gray2" fontSize={isTouch ? 'sm' : 'lg'}>
                                    {membershipSupplyText && membershipSupplyText}
                                </Text>
                            </Stack>
                            <Box
                                position="relative"
                                height="x1"
                                width="100%"
                                background="level2"
                                rounded="full"
                            >
                                <Box
                                    position="absolute"
                                    height="x1"
                                    background="cta1"
                                    rounded="full"
                                    style={{ width: `${percentageFilled * 100}%` }}
                                />
                            </Box>
                        </>
                    )}
                </Stack>
            }
            buttonContent={
                !isPreview ? (
                    <>
                        {isAuthenticatedAndConnected ? (
                            isLoadingMeetsMembership ? (
                                <MembershipStatusMessage
                                    spinner
                                    background="level3"
                                    message="Checking requirements"
                                />
                            ) : (
                                <Button
                                    tone="cta1"
                                    width={isTouch ? undefined : '300'}
                                    type="button"
                                    disabled={isJoining}
                                    onClick={onJoinClick}
                                >
                                    {isJoining && <ButtonSpinner />}
                                    Join
                                </Button>
                            )
                        ) : (
                            <Box width={isTouch ? undefined : '300'}>
                                <Suspense>
                                    <LoginComponent />
                                </Suspense>
                            </Box>
                        )}
                    </>
                ) : (
                    <></>
                )
            }
        />
    )
}

export const AbsoluteBackground = ({ networkId }: { networkId: string }) => {
    const { imageSrc } = useImageSource(networkId, ImageVariants.thumbnail600)
    return (
        <Box absoluteFill pointerEvents="none">
            <BlurredBackground imageSrc={imageSrc ?? ''} blur={60} />
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
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
    const onLogOut = useCallback(() => {
        logout()
    }, [logout])

    const navigate = useNavigate()
    const onBackToApp = useCallback(() => {
        navigate('/')
    }, [navigate])

    return (
        <Box rounded="md" minWidth="250" pointerEvents="all" overflow="hidden" boxShadow="card">
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
            {abstractAccountAddress && (
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
                        label={shortAddress(abstractAccountAddress)}
                        clipboardContent={abstractAccountAddress}
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
        </Box>
    )
}

export const TownNotFoundBox = () => (
    <FadeInBox centerContent gap="lg" maxWidth="400" data-testid="town-not-found-box">
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
