import { Box, CssBaseline, Divider, Drawer, Toolbar } from '@mui/material'
import { InviteData, RoomIdentifier } from 'use-zion-client'
import { Outlet, useNavigate } from 'react-router-dom'
import React, { useCallback, useState } from 'react'

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

    const onMeClick = () => {
        navigate('/')
    }

    const onWeb3Click = () => {
        navigate('/web3')
    }

    const onLinkedWalletsClick = () => {
        navigate('/wallet-linking')
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
            <SidebarItemButton label="Linked Wallets" onClick={onLinkedWalletsClick} />
            <SidebarItemButton label="Logins" onClick={onLoginsClick} />
            <SidebarItemButton label="Me" onClick={onMeClick} />
            <Divider />
            <DebugBar />
        </div>
    )

    const container = window !== undefined ? () => window().document.body : undefined

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
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
                <Outlet />
            </Box>
        </Box>
    )
}
