import { useChannel, useSpace } from '@river-build/react-sdk'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useState } from 'react'
import { ArrowLeftIcon, PlusIcon } from '@radix-ui/react-icons'
import { GridSidePanel } from '@/components/layout/grid-side-panel'
import { SpaceProvider } from '@/hooks/current-space'
import { CreateChannel } from '@/components/form/channel/create'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/tooltip'

export const SelectChannelRoute = () => {
    const navigate = useNavigate()
    const { spaceId } = useParams<{ spaceId: string }>()
    const { data: space } = useSpace(spaceId!)
    const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false)
    const onChannelChange = useCallback(
        (channelId: string) => {
            navigate(`/t/${spaceId}/${channelId}`)
        },
        [navigate, spaceId],
    )
    const spaceName = space.metadata?.name || 'Unnamed Space'

    return (
        <SpaceProvider spaceId={spaceId}>
            <GridSidePanel
                side={
                    <>
                        <div className="flex items-center gap-2">
                            <Link to="..">
                                <ArrowLeftIcon className="h-4 w-4" />
                            </Link>
                            <h2 className="text-xl font-bold">{spaceName}</h2>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-xs">Select a channel to start messaging</h2>
                            <div className="flex items-center gap-2">
                                <Dialog
                                    open={createChannelDialogOpen}
                                    onOpenChange={setCreateChannelDialogOpen}
                                >
                                    <Tooltip title="Create a channel">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCreateChannelDialogOpen(true)}
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </Button>
                                    </Tooltip>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create a channel</DialogTitle>
                                        </DialogHeader>
                                        <DialogDescription>
                                            Create a channel in the {spaceName} space.
                                        </DialogDescription>
                                        <CreateChannel
                                            spaceId={space.id}
                                            onChannelCreated={(channelId) => {
                                                onChannelChange(channelId)
                                                setCreateChannelDialogOpen(false)
                                            }}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                        <ScrollArea className="flex min-h-0 flex-1 flex-col">
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
