import { useMatch } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import React from 'react'
import { RiverPointsPanel } from '@components/PointsPanel/PointsPanel'
import { RoleRestrictedChannelJoinPanel } from 'routes/RoleRestrictedChannelJoinPanel'
import { SpacesChannelReplies } from 'routes/SpacesChannelReplies'
import { TownMembersPanel } from '@components/TownMembersPanel/TownMembersPanel'
import { TradingDepositPanel } from '@components/Web3/Trading/TradingDepositPanel'
import { TradingPanel } from '@components/Web3/Trading/TradingPanel'
import { TradingWalletPanel } from '@components/Web3/Trading/TradingWalletPanel'
import { UserPreferences } from '@components/UserProfile/UserPreferences'
import { VerifyEventSignaturePanel } from '@components/VerifyEventSignature/VerfiyEventSignature'
import { Panel } from '@components/Panel/Panel'
import { MintBotPrivyWrapper } from '@components/MintBotPanel/MintBotPanel'
import { BrowseChannelsPanel } from '@components/BrowseChannelsPanel/BrowseChannelsPanel'
import { ChannelInfoPanel } from 'routes/SpaceChannelInfoPanel'
import { SpaceChannelWrapper } from '@components/Channel/ChannelWrapper'
import { SpaceProfilePanel } from 'routes/SpacesProfilePanel'
import { ChannelMembersPanel } from '@components/ChannelMembersPanel/ChannelMembersPanel'
import { CreateChannelPanel } from '@components/CreateChannelPanel/CreateChannelPanel'
import { SpaceInfoPanel } from 'routes/SpaceInfoPanel'
import { RolesPanel } from '@components/SpaceSettingsPanel/RolesPanel'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
import { ChannelPermissionsNameDescriptionPanel } from '@components/ChannelSettings/ChannelPermissionsNameDescriptionForm'
import { useCreateLink } from 'hooks/useCreateLink'
import { ChannelInvitePanel } from 'routes/ChannelInvitePanel'
import { EditMembershipSettingsPanel } from '@components/SpaceSettingsPanel/EditMembershipSettingsPanel'
import { SpaceSettingsNavigationPanel } from '@components/SpaceSettingsPanel/SpaceSettingsNavigationPanel'
import { EditPrepaidPanel } from '@components/SpaceSettingsPanel/EditPrepaidPanel'
import { ChannelRiverMetadataSettingsPanel } from '@components/ChannelSettings/ChannelRiverMetadataSettingsForm'
import { ChannelPermissionOverridesPanel } from '@components/ChannelSettings/ChannelPermissionOverridesPanel'
import { BearerTokenPrivyWrapper } from '@components/BearerTokenPanel/BearerTokenPanel'
import { SingleWalletPanel } from '@components/Web3/Wallet/SingleWalletPanel'
import { TransferAssetsPanel } from '@components/Web3/Wallet/TransferAssetsPanel'
import { PrivyIdentityPanel } from '@components/PrivyIdentity/PrivyIdentityPanel'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { BugReportPanel } from 'routes/BugReportPanel'
import { DMChannelInfoPanel } from 'routes/DMChannelInfoPanel'
import { NodeStatusPanel } from '@components/NodeConnectionStatusPanel/ConnectionStatusPanel'
import { SpaceBannedUsers } from 'routes/SpaceBannedUsers'
import { MutualTownsPanel } from '@components/MutualTownsPanel/MutualTownsPanel'
import { PinsPanel } from '@components/PinsPanel/PinsPanel'
import { ReviewsPanel } from '@components/TownReviews/ReviewsPanel'

export const usePanels = () => {
    const [searchParams] = useSearchParams()
    const { createLink } = useCreateLink()

    const panel = searchParams.get('panel')

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
        case CHANNEL_INFO_PARAMS.TRANSFER_ASSETS: {
            return <TransferAssetsPanel />
        }
        case CHANNEL_INFO_PARAMS.SINGLE_WALLET: {
            return <SingleWalletPanel />
        }
        case CHANNEL_INFO_PARAMS.BUG_REPORT: {
            return <BugReportPanel />
        }
        case CHANNEL_INFO_PARAMS.BANNED: {
            return <SpaceBannedUsers />
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
            return withWrapper(<ChannelMembersPanel />)
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
        case CHANNEL_INFO_PARAMS.IDENTITY: {
            return <PrivyIdentityPanel />
        }
        case CHANNEL_INFO_PARAMS.WALLETS: {
            return (
                <Panel label="Wallets">
                    <WalletLinkingPanel />
                </Panel>
            )
        }
        case CHANNEL_INFO_PARAMS.SPACE_SETTINGS_NAVIGATION: {
            return (
                <Panel label="Membership Settings">
                    <SpaceSettingsNavigationPanel />
                </Panel>
            )
        }
        case CHANNEL_INFO_PARAMS.PREPAID_MEMBERSHIPS: {
            return (
                <Panel label="Add Prepaid Memberships">
                    <EditPrepaidPanel />
                </Panel>
            )
        }
        case CHANNEL_INFO_PARAMS.EDIT_MEMBERSHIP: {
            return (
                <Panel label="Edit Membership Settings">
                    <EditMembershipSettingsPanel />
                </Panel>
            )
        }
        case CHANNEL_INFO_PARAMS.EDIT_CHANNEL_PERMISSIONS: {
            return withWrapper(<ChannelPermissionsNameDescriptionPanel />)
        }
        case CHANNEL_INFO_PARAMS.EDIT_CHANNEL_RIVER_METADATA: {
            return withWrapper(<ChannelRiverMetadataSettingsPanel />)
        }
        case CHANNEL_INFO_PARAMS.INVITE: {
            return withWrapper(<ChannelInvitePanel />)
        }

        case CHANNEL_INFO_PARAMS.PREFERENCES: {
            return (
                <Panel label="Preferences">
                    <UserPreferences />
                </Panel>
            )
        }
        case CHANNEL_INFO_PARAMS.NODE_STATUS: {
            return <NodeStatusPanel />
        }
        case CHANNEL_INFO_PARAMS.MINT_BOT: {
            return withWrapper(<MintBotPrivyWrapper />)
        }
        case CHANNEL_INFO_PARAMS.BEARER_TOKEN: {
            return <BearerTokenPrivyWrapper />
        }
        case CHANNEL_INFO_PARAMS.ROLE_RESTRICTED_CHANNEL_JOIN: {
            return <RoleRestrictedChannelJoinPanel />
        }
        case CHANNEL_INFO_PARAMS.MUTUAL_TOWNS: {
            const userId = searchParams.get('profileId')
            if (userId) {
                return <MutualTownsPanel userId={userId} />
            } else {
                return null
            }
        }
        case CHANNEL_INFO_PARAMS.PINS: {
            return withWrapper(<PinsPanel />)
        }

        case CHANNEL_INFO_PARAMS.EDIT_CHANNEL_PERMISSION_OVERRIDES: {
            const roleId = Number(searchParams.get('roleId'))
            if (typeof roleId === 'number') {
                return withWrapper(<ChannelPermissionOverridesPanel roleId={roleId} />)
            } else {
                return null
            }
        }

        case CHANNEL_INFO_PARAMS.TOWN_MEMBERS: {
            return withWrapper(<TownMembersPanel />)
        }
        case CHANNEL_INFO_PARAMS.VERIFY_EVENT_SIGNATURE: {
            return <VerifyEventSignaturePanel />
        }
        case CHANNEL_INFO_PARAMS.RIVER_POINTS: {
            return <RiverPointsPanel />
        }
        case CHANNEL_INFO_PARAMS.TRADING_WALLET: {
            return <TradingWalletPanel />
        }
        case CHANNEL_INFO_PARAMS.TRADING_DEPOSIT: {
            return <TradingDepositPanel />
        }
        case CHANNEL_INFO_PARAMS.TRADE_PANEL: {
            return <TradingPanel />
        }
        case CHANNEL_INFO_PARAMS.REVIEWS: {
            return <ReviewsPanel />
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
