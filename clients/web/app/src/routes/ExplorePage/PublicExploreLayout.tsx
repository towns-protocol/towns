import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, Button, Card, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { Analytics } from 'hooks/useAnalytics'
import { useStartupTime } from 'StartupProvider'
import { AppStoreBanner } from '@components/AppStoreBanner/AppStoreBanner'
import { useMobile } from 'hooks/useMobile'

export const PublicExploreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isMobile = useMobile()

    const { login } = useCombinedAuth()
    const [, resetStartupTime] = useStartupTime()

    const onClickLogin = useCallback(() => {
        resetStartupTime()
        Analytics.getInstance().track('clicked login')
        login()
    }, [login, resetStartupTime])

    return (
        <>
            <Stack absoluteFill padding="xs">
                <AppStoreBanner insetX="xxs" insetTop="xxs" />
                <Box>
                    <Card horizontal paddingX minHeight="x6" grow={false}>
                        <Box centerContent padding="xs">
                            <Link to="/">
                                <LogoSingleLetter />
                            </Link>
                        </Box>
                        <Box grow />
                        <Box centerContent>
                            <Button
                                tone="lightHover"
                                rounded="full"
                                color="default"
                                size="button_sm"
                                data-testid="public-explore-log-in-button"
                                onClick={onClickLogin}
                            >
                                Log In
                            </Button>
                        </Box>
                    </Card>
                </Box>
                {!isMobile ? (
                    <Box grow position="relative">
                        <Card scroll absoluteFill>
                            {children}
                        </Card>
                    </Box>
                ) : (
                    <Box grow scroll>
                        {children}
                    </Box>
                )}
            </Stack>
        </>
    )
}
