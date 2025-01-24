import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, Button, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { Analytics } from 'hooks/useAnalytics'
import { useStartupTime } from 'StartupProvider'

export const PublicExploreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { login } = useCombinedAuth()
    const [, resetStartupTime] = useStartupTime()

    const onClickLogin = useCallback(() => {
        resetStartupTime()
        Analytics.getInstance().track('clicked login')
        login()
    }, [login, resetStartupTime])

    return (
        <Stack height="100vh">
            <Box horizontal centerContent width="100%" background="level1">
                <Stack horizontal width="100%" paddingY="md" paddingX="lg" gap="md">
                    <Link to="/">
                        <LogoSingleLetter />
                    </Link>
                    <Box grow />
                    <Button
                        tone="lightHover"
                        color="default"
                        size="button_sm"
                        data-testid="public-explore-log-in-button"
                        onClick={onClickLogin}
                    >
                        Log In
                    </Button>
                </Stack>
            </Box>
            <Box grow scroll>
                {children}
            </Box>
        </Stack>
    )
}
