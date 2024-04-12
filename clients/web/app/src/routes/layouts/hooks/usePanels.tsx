import { useMatch } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import React from 'react'
import { BrowseChannelsPanel } from '@components/BrowseChannelsPanel/BrowseChannelsPanel'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { BugReportPanel } from 'routes/BugReportPanel'
import { DMChannelInfoPanel } from 'routes/DMChannelInfoPanel'
import { ChannelInfoPanel } from 'routes/SpaceChannelInfoPanel'
import { SpaceChannelWrapper } from 'routes/SpacesChannel'
import { SpacesChannelReplies } from 'routes/SpacesChannelReplies'
import { SpaceProfilePanel } from 'routes/SpacesProfilePanel'
import { ChannelDirectoryPanel } from 'routes/SpaceChannelDirectoryPanel'
import { CreateChannelPanel } from '@components/CreateChannelPanel/CreateChannelPanel'
import { SpaceInfoPanel } from 'routes/SpaceInfoPanel'
import { RolesPanel } from '@components/SpaceSettingsPanel/RolesPanel'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
import { Panel } from '@components/Panel/Panel'
import { ChannelSettingsPanel } from '@components/ChannelSettings/ChannelSettings'
import { useCreateLink } from 'hooks/useCreateLink'
import { ChannelInvitePanel } from 'routes/ChannelInvitePanel'

export const usePanels = () => {
    const [searchParams] = useSearchParams()

    const panel = searchParams.get('panel')
    const { createLink } = useCreateLink()

    const repliesRoute = useMatch(
        `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/${PATHS.REPLIES}/:messageId`,
    )

    const channelRoute = useMatch(`/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/*`)
    const inboxMessageRoute = useMatch(`/${PATHS.MESSAGES}/:channelId/*`)
    const messageRoute = useMatch(`/${PATHS.SPACES}/:spaceId/${PATHS.MESSAGES}/:channelId/*`)

    const withWrapper = (children: React.JSX.Element) => {
        const channelId =
            channelRoute?.params.channelId ||
            inboxMessageRoute?.params.channelId ||
            messageRoute?.params.channelId ||
            searchParams.get('channelId')

        return channelId ? (
            <SpaceChannelWrapper channelId={channelId}>{children}</SpaceChannelWrapper>
        ) : (
            children
        )
    }

    switch (panel) {
        default: {
            break
        }
        case CHANNEL_INFO_PARAMS.BUG_REPORT: {
            return <BugReportPanel />
        }
        case CHANNEL_INFO_PARAMS.BROWSE_CHANNELS: {
            return <BrowseChannelsPanel />
        }
        case CHANNEL_INFO_PARAMS.CHANNEL_INFO: {
            return withWrapper(<ChannelInfoPanel />)
        }
        case CHANNEL_INFO_PARAMS.GDM_CHANNEL_INFO:
        case CHANNEL_INFO_PARAMS.DM_CHANNEL_INFO: {
            return withWrapper(<DMChannelInfoPanel />)
        }

        case CHANNEL_INFO_PARAMS.PROFILE: {
            return <SpaceProfilePanel />
        }
        case CHANNEL_INFO_PARAMS.DIRECTORY: {
            return withWrapper(<ChannelDirectoryPanel />)
        }
        case CHANNEL_INFO_PARAMS.CREATE_CHANNEL: {
            return withWrapper(<CreateChannelPanel />)
        }
        case CHANNEL_INFO_PARAMS.TOWN_INFO: {
            return <SpaceInfoPanel />
        }
        case CHANNEL_INFO_PARAMS.ROLES: {
            return <RolesPanel />
        }
        case CHANNEL_INFO_PARAMS.WALLETS: {
            return (
                <Panel label="Wallets">
                    <WalletLinkingPanel />
                </Panel>
            )
        }
        case CHANNEL_INFO_PARAMS.EDIT_CHANNEL: {
            return withWrapper(<ChannelSettingsPanel />)
        }
        case CHANNEL_INFO_PARAMS.INVITE: {
            return withWrapper(<ChannelInvitePanel />)
        }
    }

    if (repliesRoute) {
        return withWrapper(
            <SpacesChannelReplies
                parentRoute={createLink({ channelId: repliesRoute.params.channelId })}
            />,
        )
    }

    return null
}
