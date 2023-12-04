import React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { NESTED_PROFILE_PANEL_PATHS } from 'routes'
import { Panel } from '@components/Panel/Panel'
import { IconButton } from '@ui'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
const { WALLETS } = NESTED_PROFILE_PANEL_PATHS

function renderPanel(path: string | undefined) {
    switch (path) {
        case WALLETS:
            return {
                label: 'Wallets',
                component: <WalletLinkingPanel />,
            }
        default:
            return {
                label: 'Not found',
                component: <h1>Not found</h1>,
            }
    }
}

export function NestedPanel() {
    const location = useLocation()
    const panelId = location.pathname.split('/').at(-1)
    const navigate = useNavigate()
    const { label, component } = renderPanel(panelId)

    function onBackClick() {
        navigate(location.state?.from ?? '../', {
            state: {
                from: null,
            },
        })
    }

    function onCloseClick() {
        navigate('../', {
            state: {
                from: null,
            },
        })
    }

    return (
        <Panel
            label={label}
            leftBarButton={<IconButton icon="arrowLeft" onClick={onBackClick} />}
            onClose={onCloseClick}
        >
            {component}
        </Panel>
    )
}
