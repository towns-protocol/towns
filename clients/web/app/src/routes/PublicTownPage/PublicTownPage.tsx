import { clsx } from 'clsx'
import debug from 'debug'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Link } from 'react-router-dom'
import { useConnectivity, useContractSpaceInfoWithoutClient } from 'use-towns-client'
import { getTownDataFromSSR } from 'utils/parseTownDataFromSSR'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { TownPageLayout } from '@components/TownPageLayout/TownPageLayout'
import { FadeInBox } from '@components/Transitions'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { Box, BoxProps, Button, Heading, Icon, IconButton, Paragraph, Stack } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { useDevice } from 'hooks/useDevice'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'

import { useCombinedAuth } from 'privy/useCombinedAuth'
import { atoms } from 'ui/styles/atoms.css'
import { darkTheme } from 'ui/styles/vars.css'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { usePublicTownsPageAnalyticsEvent } from '@components/Analytics/usePublicTownPageAnalyticsEvent'
import { useStartupTime } from 'StartupProvider'
import { AppStoreBanner } from '@components/AppStoreBanner/AppStoreBanner'
import { BottomBarContent } from './BottomBarContent'

const log = debug('app:public-town')
log.enabled = true

const PublicTownPage = (props: { isPreview?: boolean; onClosePreview?: () => void }) => {
    const { isPreview = false, onClosePreview } = props
    const spaceId = useSpaceIdFromPathname()

    const { data: _spaceInfo, isLoading } = useContractSpaceInfoWithoutClient(spaceId)

    const spaceInfoFromSSR = useMemo(() => {
        return getTownDataFromSSR()
    }, [])

    const spaceInfo = _spaceInfo || spaceInfoFromSSR?.townData
    const className = clsx([darkTheme, atoms({ color: 'default' })])

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

    return spaceInfo ? (
        <>
            <AbsoluteBackground networkId={spaceInfo.networkId} />

            <Box absoluteFill bottom="none" className={className}>
                <AppStoreBanner />
                <TownPageLayout
                    headerContent={<Header isPreview={isPreview} onClosePreview={onClosePreview} />}
                    bottomContent={({ leftColWidth, rightColWidth }) => (
                        <BottomBarContent
                            leftColWidth={leftColWidth}
                            rightColWidth={rightColWidth}
                        />
                    )}
                    spaceInfo={spaceInfo}
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
    ) : (
        <MessageBox>
            <TownNotFoundBox />
        </MessageBox>
    )
}

export const PublicTownPageForUnauthenticatedRoute = React.memo(
    (props: { isPreview?: boolean; onClosePreview?: () => void }) => {
        usePublicTownsPageAnalyticsEvent({ authenticated: false })
        return <PublicTownPage {...props} />
    },
)

export const PublicTownPageForAuthenticatedUser = React.memo(
    (props: { isPreview?: boolean; onClosePreview?: () => void }) => {
        return <PublicTownPage {...props} />
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

    const onClickExplore = useCallback(() => {
        navigate('/explore')
    }, [navigate])

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
                {isAuthenticated && fromLink && isTouch ? (
                    <IconButton
                        centerContent
                        color="default"
                        icon="arrowLeft"
                        background="lightHover"
                        width="x4"
                        height="x4"
                        onClick={onNavigateBack}
                    />
                ) : !isAuthenticated ? (
                    <Link to="/">
                        <LogoSingleLetter />
                    </Link>
                ) : null}
                <Box grow />
                {isPreview ? (
                    <IconButton hoverable icon="close" color="default" onClick={onClosePreview} />
                ) : !isAuthenticated ? (
                    <Stack horizontal gap="sm">
                        <Button
                            tone="lightHover"
                            color="default"
                            size="button_sm"
                            data-testid="town-preview-log-in-button"
                            onClick={onClickExplore}
                        >
                            Explore
                        </Button>
                        <Button
                            tone="lightHover"
                            color="default"
                            size="button_sm"
                            data-testid="town-preview-log-in-button"
                            onClick={onClickLogin}
                        >
                            Log In
                        </Button>
                    </Stack>
                ) : null}
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
