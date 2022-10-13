import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useZionClient } from 'use-zion-client'
import { Avatar, Box, Card, Divider, Paragraph, Stack } from '@ui'
import { useStore } from 'store/store'
import { MenuItem } from './SpaceSettingsCard'

type Props = {
    userId: string | null
    username: string | null
    displayName?: string
    avatarUrl?: string
}

export const ProfileSettingsCard = (props: Props) => {
    const { username = '', avatarUrl, displayName } = props

    const { setTheme, theme } = useStore((state) => ({
        theme: state.theme,
        setTheme: state.setTheme,
    }))

    const onThemeClick = () => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }

    const navigate = useNavigate()

    const onSettingsClick = useCallback(() => {
        navigate('/me')
    }, [navigate])

    const onSetupClick = useCallback(() => {
        navigate('/register')
    }, [navigate])

    const { logout } = useZionClient()

    const onLogoutClick = useCallback(() => {
        logout()
    }, [logout])

    return (
        <Card border paddingBottom="sm" width="300" fontSize="md">
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
            <MenuItem icon="profile" onClick={onSettingsClick}>
                Profile
            </MenuItem>
            <MenuItem icon="settings" onClick={onSetupClick}>
                Preferences
            </MenuItem>
            <MenuItem icon="back" onClick={onThemeClick}>
                Switch Theme
            </MenuItem>
            <MenuItem icon="logout" onClick={onLogoutClick}>
                Logout
            </MenuItem>
        </Card>
    )
}

// const MenuItem = ({ children, ...props }: BoxProps) => (
//   <Box grow paddingY="sm" background={{ hover: "level3" }} {...props}>
//     <Stack horizontal paddingX="md" cursor="pointer">
//       {children}
//     </Stack>
//   </Box>
// );

export const shortenAddress = (s: string, charsStart = 6, charsEnd = 2, delimiter = '..') => {
    return (s?.length ?? 0) <= charsStart + delimiter.length + charsEnd
        ? s
        : `${s.substring(0, charsStart)}${delimiter}${s.substring(s.length - charsEnd)}`
}
