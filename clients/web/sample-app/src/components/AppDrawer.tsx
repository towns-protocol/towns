import {
    AppBar,
    Box,
    Button,
    CssBaseline,
    Divider,
    Drawer,
    Theme,
    Toolbar,
    Typography,
} from '@mui/material'
import {
    InviteData,
    RoomIdentifier,
    getAccountAddress,
    getShortUsername,
    useMatrixCredentials,
} from 'use-zion-client'
import { Outlet, useNavigate } from 'react-router-dom'
import React, { useCallback, useMemo, useState } from 'react'

import { Logout } from './Logout'
import { Invites } from './Invites'
import { SidebarNewItemButton } from './Buttons/SidebarNewItemButton'
import { SidebarItemButton } from './Buttons/SidebarItemButton'
import { AppDrawerSpaces } from './AppDrawerSpaces'
import { DebugBar } from './DebugBar'

const drawerWidth = 240

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won"t need it on your project.
     */
    window?: () => Window
}

export function AppDrawer(props: Props): JSX.Element {
    const { window } = props
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const { userId } = useMatrixCredentials()

    const myWalletAddress = useMemo(() => {
        if (userId) {
            const accountAddress = getAccountAddress(userId)
            return accountAddress ? getShortUsername(accountAddress) : undefined
        }
    }, [userId])

    const handleDrawerToggle = useCallback(() => {
        setMobileOpen(!mobileOpen)
    }, [mobileOpen])

    const onClickSpace = (spaceId: RoomIdentifier) => {
        console.log('onClickSpace', spaceId)
        navigate('/spaces/' + spaceId.slug + '/')
    }

    const onClickThreads = (spaceId: RoomIdentifier) => {
        console.log('onClickThreads', spaceId)
        navigate('/spaces/' + spaceId.slug + '/threads/')
    }

    const onClickMentions = (spaceId: RoomIdentifier) => {
        console.log('onClickMentions', spaceId)
        navigate('/spaces/' + spaceId.slug + '/mentions/')
    }

    const onClickChannel = (spaceId: RoomIdentifier, channelId: RoomIdentifier) => {
        console.log('onClickChannel', spaceId, channelId)
        navigate('/spaces/' + spaceId.slug + '/channels/' + channelId.slug + '/')
    }

    const onClickInvite = (invite: InviteData) => {
        if (invite.spaceParentId) {
            navigate('/spaces/' + invite.spaceParentId.slug + '/channels/' + invite.id.slug)
        } else {
            navigate('/spaces/' + invite.id.slug)
        }
    }

    const onClickCreateSpace = () => {
        navigate('/spaces/new')
    }

    const onHomeClick = () => {
        navigate('/')
    }

    const onWeb3Click = () => {
        navigate('/web3')
    }

    const onLoginsClick = () => {
        navigate('/logins')
    }

    const drawer = (
        <div>
            <Toolbar />
            <Divider />
            <AppDrawerSpaces
                onClickSpace={onClickSpace}
                onClickThreads={onClickThreads}
                onClickMentions={onClickMentions}
                onClickChannel={onClickChannel}
            />
            <Divider />
            <SidebarNewItemButton label="Create A Town" onClick={onClickCreateSpace} />
            <Divider />
            <Invites title="Invites" onClickInvite={onClickInvite} />
            <SidebarItemButton label="Web 3" onClick={onWeb3Click} />
            <SidebarItemButton label="Logins" onClick={onLoginsClick} />
            <Divider />
            <DebugBar />
        </div>
    )

    const container = window !== undefined ? () => window().document.body : undefined

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <Box display="flex" flexDirection="row" alignItems="center">
                    <Button variant="text" onClick={onHomeClick}>
                        <Typography
                            noWrap
                            variant="h6"
                            component="div"
                            sx={spacingStyle}
                            color="white"
                        >
                            Matrix Client
                        </Typography>
                    </Button>
                    <Box display="flex" flexDirection="row" flexGrow={1} />
                    <Box sx={spacingStyle} alignItems="right">
                        <Button variant="text" onClick={onHomeClick}>
                            <Typography color="white">{myWalletAddress}</Typography>
                        </Button>
                    </Box>
                    <Box sx={spacingStyle}>
                        <Logout />
                    </Box>
                </Box>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                    onClose={handleDrawerToggle}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    open
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
