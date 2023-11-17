import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Box, Card, Divider, Paragraph, Stack } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useStore } from 'store/store'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { shortAddress } from 'ui/utils/utils'
import { useCreateLink } from 'hooks/useCreateLink'
import { Avatar } from '@components/Avatar/Avatar'
import { MenuItem } from './MenuItem'

type Props = {
    userId: string | null
    displayName?: string
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

    const { createLink: createProfileLink } = useCreateLink()

    const link = userId ? createProfileLink({ profileId: 'me' }) : undefined

    const onProfileClick = useCallback(() => {
        closeCard()
        if (link) {
            navigate(link)
        }
    }, [closeCard, link, navigate])

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
