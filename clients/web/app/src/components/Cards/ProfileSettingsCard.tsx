import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Avatar, Box, Card, Divider, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { useAuth } from 'hooks/useAuth'
import { MenuItem } from './MenuItem'

type Props = {
    userId: string | null
    username: string | null
    displayName?: string
    avatarUrl?: string
}

export const ProfileSettingsCard = (props: Props) => {
    const { username = '', avatarUrl, displayName } = props
    const { logout } = useAuth()

    const { closeCard } = useCardOpenerContext()

    const { setTheme, theme } = useStore((state) => ({
        theme: state.theme,
        setTheme: state.setTheme,
    }))

    const onThemeClick = () => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }

    const navigate = useNavigate()

    const onSettingsClick = useCallback(() => {
        closeCard()
        navigate('/me')
    }, [closeCard, navigate])

    const onSetupClick = useCallback(() => {
        closeCard()
        navigate(`/${PATHS.PREFERENCES}`)
    }, [closeCard, navigate])

    return (
        <Card border paddingBottom="sm" width="300" fontSize="md" tabIndex={1}>
            <Stack horizontal padding gap="md" alignItems="center">
                <Box>
                    <Avatar size="avatar_x4" src={avatarUrl} />
                </Box>
                <Stack grow gap fontWeight="strong" color="default">
                    <Paragraph>{displayName && displayName}</Paragraph>
                    <Paragraph color="gray2">
                        {username && shortenAddress(username, 6, 2)}
                    </Paragraph>
                </Stack>
            </Stack>
            <Divider />
            {/* <MenuItem icon="settings" onClick={onThemeClick}>
        Switch to {theme !== "light" ? "light" : "dark"} theme
      </MenuItem> */}
            <MenuItem selected icon="profile" onClick={onSettingsClick}>
                Profile
            </MenuItem>
            <MenuItem icon="settings" onClick={onSetupClick}>
                Preferences
            </MenuItem>
            <MenuItem icon="back" onClick={onThemeClick}>
                Switch Theme
            </MenuItem>
            <MenuItem icon="logout" onClick={logout}>
                Logout
            </MenuItem>
        </Card>
    )
}

export const shortenAddress = (s: string, charsStart = 6, charsEnd = 2, delimiter = '..') => {
    return (s?.length ?? 0) <= charsStart + delimiter.length + charsEnd
        ? s
        : `${s.substring(0, charsStart)}${delimiter}${s.substring(s.length - charsEnd)}`
}
