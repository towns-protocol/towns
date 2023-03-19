import React, { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { Avatar, Box, Card, Divider, Paragraph, Stack } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { PATHS } from 'routes'
import { useStore } from 'store/store'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { shortAddress } from 'ui/utils/utils'
import { MenuItem } from './MenuItem'

type Props = {
    userId: string | null
    username: string | null
    displayName?: string
    avatarUrl?: string
    userAddress?: string
}

export const ProfileSettingsCard = (props: Props) => {
    const { userAddress, displayName, userId } = props
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

    const matchSpace = useMatch(`${PATHS.SPACES}/:spaceSlug/*`)
    const matchChannel = useMatch(`${PATHS.SPACES}/:spaceSlug/${PATHS.CHANNELS}/:channelSlug/*`)

    const onProfileClick = useCallback(() => {
        closeCard()
        let link = `/me`
        if (matchChannel) {
            link = `${PATHS.SPACES}/${matchChannel.params.spaceSlug}/${PATHS.CHANNELS}/${matchChannel.params.channelSlug}/profile/${userId}`
        } else if (matchSpace) {
            const segment = matchSpace.params['*']?.split('/')?.[0] ?? ''
            // matches threads/mentions/members
            link = `${PATHS.SPACES}/${matchSpace.params.spaceSlug}/${
                segment ? `${segment}/` : ``
            }profile/${userId}`
        }
        navigate(link)
    }, [closeCard, matchChannel, matchSpace, navigate, userId])

    return (
        <Card border paddingBottom="sm" width="300" fontSize="md" tabIndex={1}>
            <Stack horizontal padding gap="md" alignItems="center">
                <Box>
                    <Avatar size="avatar_x4" userId={userId ?? ''} />
                </Box>
                <Stack grow gap fontWeight="strong" color="default">
                    <Paragraph>{displayName && displayName}</Paragraph>
                    <Paragraph color="gray2">{userAddress && shortAddress(userAddress)}</Paragraph>
                </Stack>
            </Stack>
            <Divider />
            {/* <MenuItem icon="settings" onClick={onThemeClick}>
        Switch to {theme !== "light" ? "light" : "dark"} theme
      </MenuItem> */}
            <MenuItem selected icon="profile" onClick={onProfileClick}>
                Profile
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
