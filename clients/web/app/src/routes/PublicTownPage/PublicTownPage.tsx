import { Allotment } from 'allotment'
import { clsx } from 'clsx'
import debug from 'debug'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Link } from 'react-router-dom'
import { useConnectivity, useContractSpaceInfoWithoutClient, useMyProfile } from 'use-towns-client'
import { getTownDataFromSSR } from 'utils/parseTownDataFromSSR'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { MainSideBar } from '@components/SideBars'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { TownPageActivity } from '@components/TownPageLayout/TownPageActivity'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { FadeInBox } from '@components/Transitions'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Box, BoxProps, Button, Heading, Icon, IconButton, Paragraph, Stack } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Analytics } from 'hooks/useAnalytics'
import { useDevice } from 'hooks/useDevice'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { atoms } from 'ui/styles/atoms.css'
import { darkTheme } from 'ui/styles/vars.css'
import { shortAddress } from 'ui/utils/utils'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { Avatar } from '@components/Avatar/Avatar'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'
import { useStartupTime } from 'StartupProvider'
import { BottomBarContent } from './BottomBarContent'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

const log = debug('app:public-town')
log.enabled = true

const PublicTownPageWithoutAuth = (props: { isPreview?: boolean; onClosePreview?: () => void }) => {
    const { isPreview = false, onClosePreview } = props
    const spaceId = useSpaceIdFromPathname()
    const { isConnected: connected } = useCombinedAuth()

    const { data: _spaceInfo, isLoading } = useContractSpaceInfoWithoutClient(spaceId)

    const spaceInfoFromSSR = useMemo(() => {
        return getTownDataFromSSR()
    }, [])

    const spaceInfo = _spaceInfo || spaceInfoFromSSR?.townData
    const className = clsx([darkTheme, atoms({ color: 'default' })])
    const isJoining = !!usePublicPageLoginFlow().spaceBeingJoined

    const { isTouch } = useDevice()
    const location = useLocation()

    useEffect(() => {
        console.log('[PublicTownPage][route]', 'route', {
            deviceType: isTouch ? 'mobile' : 'desktop',
            locationPathname: location.pathname,
            locationSearch: location.search,
        })
    }, [isTouch, location.pathname, location.search])

    useEffect(() => {
        return () => {
            console.log('[app progress] public town page unmounting')
        }
    }, [])

    useEffect(() => {
        if (isPreview) {
            return
        }
        Analytics.getInstance().page('home-page', 'public town page', {
            spaceId,
        })
    }, [isPreview, spaceId])

    useEffect(() => {
        console.log('[analytics]')
    }, [])

    return spaceInfo ? (
        <>
            <AbsoluteBackground networkId={spaceInfo.networkId} />

            <Box absoluteFill height="100dvh" bottom="none" className={className}>
                <TownPageLayout
                    headerContent={<Header isPreview={isPreview} onClosePreview={onClosePreview} />}
                    bottomContent={({ leftColWidth, rightColWidth }) => (
                        <BottomBarContent
                            isJoining={isJoining}
                            leftColWidth={leftColWidth}
                            rightColWidth={rightColWidth}
                        />
                    )}
                    spaceInfo={spaceInfo}
                    activityContent={
                        !isJoining && <TownPageActivity townId={spaceInfo.networkId} />
                    }
                    isPreview={isPreview}
                    spaceId={spaceInfo.networkId}
                />
            </Box>
        </>
    ) : isLoading ? (
        <AppProgressOverlayTrigger
            progressState={AppProgressState.LoggingIn}
            debugSource="public town page isLoading"
        />
    ) : connected ? (
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
        </Stack>
    ) : (
        <MessageBox>
            <TownNotFoundBox />
        </MessageBox>
    )
}

export const PublicTownPage = React.memo(
    (props: { isPreview?: boolean; onClosePreview?: () => void }) => {
        return (
            <PrivyWrapper>
                <PublicTownPageWithoutAuth {...props} />
            </PrivyWrapper>
        )
    },
)

const Header = (props: { isPreview: boolean; onClosePreview?: () => void }) => {
    const { isAuthenticated } = useConnectivity()
    const { isPreview, onClosePreview } = props
    const { login } = useCombinedAuth()
    const [, resetStartupTime] = useStartupTime()

    const onClickLogin = useCallback(() => {
        // reset the app start time if the user clicks the Login button
        resetStartupTime()
        Analytics.getInstance().track('clicked login')
        login()
    }, [login, resetStartupTime])

    const fromLink = useLocation().state?.fromLink === true
    const navigate = useNavigate()
    const { isTouch } = useDevice()
    const onNavigateBack = useCallback(() => {
        if (fromLink) {
            navigate(-1)
        } else {
            navigate('/')
        }
    }, [fromLink, navigate])

    return (
        <Box horizontal centerContent width="100%">
            <Stack horizontal width="100%" paddingY="md" gap="md">
                {fromLink && isTouch ? (
                    <IconButton
                        centerContent
                        color="default"
                        icon="arrowLeft"
                        background="lightHover"
                        width="x4"
                        height="x4"
                        onClick={onNavigateBack}
                    />
                ) : (
                    <Link to="/">
                        <LogoSingleLetter />
                    </Link>
                )}

                <Box grow />
                {isPreview ? (
                    <IconButton hoverable icon="close" color="default" onClick={onClosePreview} />
                ) : (
                    <>
                        {isAuthenticated && !isTouch ? <HomeButton /> : null}
                        <AppBugReportButton />

                        {isAuthenticated ? (
                            <LoggedUserAvatar />
                        ) : (
                            <Button
                                tone="lightHover"
                                color="default"
                                size="button_sm"
                                data-testid="town-preview-log-in-button"
                                onClick={onClickLogin}
                            >
                                Log In
                            </Button>
                        )}
                    </>
                )}
            </Stack>
        </Box>
    )
}

export const AbsoluteBackground = ({ networkId }: { networkId: string }) => {
    const { imageSrc } = useImageSource(networkId, ImageVariants.thumbnail600)
    const className = clsx([darkTheme, atoms({ background: 'default' })])
    return (
        <Box absoluteFill pointerEvents="none" className={className}>
            <BlurredBackground imageSrc={imageSrc ?? ''} blur={60} />
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
    const { isAuthenticated } = useConnectivity()

    if (!isAuthenticated || !profileUser) {
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
            <Avatar size="avatar_x4" userId={profileUser.userId} />
        </Box>
    )
}

const LoggedUserMenu = () => {
    const { logout } = useCombinedAuth()
    const { loggedInWalletAddress } = useConnectivity()
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

export const HomeButton = () => {
    const fromLink = useLocation().state?.fromLink === true
    const navigate = useNavigate()

    const onClick = useCallback(() => {
        if (fromLink) {
            navigate(-1)
        } else {
            navigate('/')
        }
    }, [fromLink, navigate])

    return (
        <Button size="button_sm" tone="lightHover" color="default" onClick={onClick}>
            {fromLink ? 'Back' : 'Home'}
        </Button>
    )
}
