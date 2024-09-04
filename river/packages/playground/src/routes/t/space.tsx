import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { useCallback } from 'react'
import { ChannelsBlock } from '@/components/blocks/channels'
import { SpaceProvider } from '@/hooks/current-space'

export const SpaceRoute = () => {
    const navigate = useNavigate()
    const { spaceId } = useParams<{ spaceId: string }>()

    const onChannelChange = useCallback(
        (channelId: string) => {
            navigate(`/t/${spaceId}/${channelId}`)
        },
        [navigate, spaceId],
    )

    return (
        <SpaceProvider spaceId={spaceId}>
            <ChannelsBlock onChannelChange={onChannelChange} />
            <Outlet />
        </SpaceProvider>
    )
}
