import { useChannel, useSpace } from '@river-build/react-sdk'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useCallback } from 'react'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { GridSidePanel } from '@/components/layout/grid-side-panel'
import { SpaceProvider } from '@/hooks/current-space'
import { CreateChannel } from '@/components/form/channel/create'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export const SelectChannelRoute = () => {
    const navigate = useNavigate()
    const { spaceId } = useParams<{ spaceId: string }>()
    const { data: space } = useSpace(spaceId!)
    const onChannelChange = useCallback(
        (channelId: string) => {
            navigate(`/t/${spaceId}/${channelId}`)
        },
        [navigate, spaceId],
    )

    return (
        <SpaceProvider spaceId={spaceId}>
            <GridSidePanel
                side={
                    <>
                        <div className="flex items-center gap-2">
                            <Link to="..">
                                <ArrowLeftIcon className="h-4 w-4" />
                            </Link>
                            <h2 className="text-xl font-bold">{space.metadata?.name}</h2>
                        </div>
                        <h2 className="text-lg font-medium">Create a channel</h2>
                        <CreateChannel spaceId={space.id} onChannelCreated={onChannelChange} />
                        <div className="flex flex-col gap-2">
                            <span className="text-xs">Select a channel to start messaging</span>
                            <ScrollArea className="flex h-[calc(100dvh-18rem)]">
                                <div className="flex flex-col gap-1">
                                    {space.channelIds.map((channelId) => (
                                        <ChannelInfo
                                            key={`${spaceId}-${channelId}`}
                                            spaceId={space.id}
                                            channelId={channelId}
                                            onChannelChange={onChannelChange}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        {space.channelIds.length === 0 && (
                            <p className="pt-4 text-center text-sm text-secondary-foreground">
                                You're not in any Channels yet.
                            </p>
                        )}
                    </>
                }
                main={<Outlet />}
            />
        </SpaceProvider>
    )
}

const ChannelInfo = ({
    spaceId,
    channelId,
    onChannelChange,
}: {
    spaceId: string
    channelId: string
    onChannelChange: (channelId: string) => void
}) => {
    const { data: channel } = useChannel(spaceId, channelId)

    return (
        <div>
            <Button variant="outline" onClick={() => onChannelChange(channelId)}>
                {channel.metadata?.name ? `#${channel.metadata.name}` : 'Unnamed Channel'}
            </Button>
        </div>
    )
}
