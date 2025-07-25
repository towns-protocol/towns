import { Outlet, useNavigate } from 'react-router-dom'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
    useDm,
    useGdm,
    useMember,
    useMemberList,
    useObservable,
    useSpace,
    useSyncAgent,
    useUserDms,
    useUserGdms,
    useUserSpaces,
} from '@towns-protocol/react-sdk'
import { suspend } from 'suspend-react'
import { Myself } from '@towns-protocol/sdk'
import { DoorOpenIcon, DownloadIcon, PlusIcon, SettingsIcon } from 'lucide-react'
import type { BotInfo } from '@towns-protocol/web3'
import { GridSidePanel } from '@/components/layout/grid-side-panel'
import { Button } from '@/components/ui/button'
import { CreateSpace } from '@/components/form/space/create'
import { JoinSpace } from '@/components/form/space/join'
import { Avatar } from '@/components/ui/avatar'
import { shortenAddress } from '@/utils/address'
import { useAppMetadata } from '@/hooks/useAppMetadata'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/tooltip'
import { CreateDm } from '@/components/form/dm/create'
import { CreateBotDialog } from '@/components/dialog/create-bot'
import { useAllBots } from '@/hooks/useAllBots'
import { BotInstallDialog } from '@/components/dialog/bot-install'
import { BotSettingsDialog } from '@/components/dialog/bot-settings'

export const DashboardRoute = () => {
    const navigate = useNavigate()
    const { spaceIds } = useUserSpaces()
    const { streamIds: gdmStreamIds } = useUserGdms()
    const { streamIds: dmStreamIds } = useUserDms()
    const { data: bots, isLoading: botsLoading } = useAllBots()

    useEffect(() => {
        console.log('bots', bots)
    }, [bots])
    const [joinSpaceDialogOpen, setJoinSpaceDialogOpen] = useState(false)
    const [createSpaceDialogOpen, setCreateSpaceDialogOpen] = useState(false)
    const [createDmDialogOpen, setCreateDmDialogOpen] = useState(false)
    const [createAppDialogOpen, setCreateAppDialogOpen] = useState(false)

    const navigateToSpace = useCallback(
        (spaceId: string) => {
            navigate(`/t/${spaceId}`)
        },
        [navigate],
    )

    const navigateToGdm = useCallback(
        (gdmStreamId: string) => {
            navigate(`/m/gdm/${gdmStreamId}`)
        },
        [navigate],
    )

    const navigateToDm = useCallback(
        (dmStreamId: string) => {
            navigate(`/m/dm/${dmStreamId}`)
        },
        [navigate],
    )

    return (
        <GridSidePanel
            side={
                <>
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xs">Select a space to start messaging</h2>
                        <div className="flex items-center gap-2">
                            <Dialog
                                open={createSpaceDialogOpen}
                                onOpenChange={setCreateSpaceDialogOpen}
                            >
                                <Tooltip title="Create a space">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCreateSpaceDialogOpen(true)}
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create a space</DialogTitle>
                                    </DialogHeader>
                                    <DialogDescription>
                                        Create a space to start messaging.
                                    </DialogDescription>
                                    <CreateSpace onCreateSpace={navigateToSpace} />
                                </DialogContent>
                            </Dialog>
                            <Dialog
                                open={joinSpaceDialogOpen}
                                onOpenChange={setJoinSpaceDialogOpen}
                            >
                                <Tooltip title="Join a space">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setJoinSpaceDialogOpen(true)}
                                    >
                                        <DoorOpenIcon className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Join a space</DialogTitle>
                                    </DialogHeader>
                                    <DialogDescription>
                                        You can join a space and hop into an existing conversation.
                                    </DialogDescription>
                                    <JoinSpace onJoinSpace={navigateToSpace} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        {spaceIds.map((spaceId) => (
                            <SpaceInfo
                                key={spaceId}
                                spaceId={spaceId}
                                onSpaceChange={navigateToSpace}
                            />
                        ))}
                    </div>
                    {spaceIds.length === 0 && (
                        <p className="pt-4 text-center text-sm text-secondary-foreground">
                            You're not in any spaces yet.
                        </p>
                    )}

                    <hr className="my-2" />

                    <span className="text-xs">Your group chats</span>
                    <div className="flex flex-col gap-1">
                        {gdmStreamIds.map((gdmStreamId) => (
                            <GdmInfo
                                key={gdmStreamId}
                                gdmStreamId={gdmStreamId}
                                onGdmChange={navigateToGdm}
                            />
                        ))}
                    </div>
                    {gdmStreamIds.length === 0 && (
                        <p className="pt-4 text-center text-sm text-secondary-foreground">
                            You're not in any group chats yet.
                        </p>
                    )}

                    <hr className="my-2" />

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs">Your apps</span>
                        <div className="flex items-center gap-2">
                            <Dialog
                                open={createAppDialogOpen}
                                onOpenChange={setCreateAppDialogOpen}
                            >
                                <Tooltip title="Create an app">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCreateAppDialogOpen(true)}
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <CreateBotDialog
                                    open={createAppDialogOpen}
                                    onOpenChange={setCreateAppDialogOpen}
                                />
                            </Dialog>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {botsLoading ? (
                            <p className="pt-4 text-center text-sm text-secondary-foreground">
                                Loading your apps...
                            </p>
                        ) : bots && bots.length > 0 ? (
                            bots.map((bot) => <BotCard key={bot.appId} bot={bot} />)
                        ) : (
                            <p className="pt-4 text-center text-sm text-secondary-foreground">
                                You don't have any apps yet.
                            </p>
                        )}
                    </div>

                    <hr className="my-2" />

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs">Your direct messages</span>
                        <div className="flex items-center gap-2">
                            <Dialog open={createDmDialogOpen} onOpenChange={setCreateDmDialogOpen}>
                                <Tooltip title="Create a direct message">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCreateDmDialogOpen(true)}
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create a direct message</DialogTitle>
                                    </DialogHeader>
                                    <DialogDescription>
                                        Create a direct message with another user.
                                    </DialogDescription>
                                    <CreateDm onDmCreated={navigateToDm} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {dmStreamIds.map((dmStreamId) => (
                            <Suspense key={dmStreamId} fallback={<div>Loading...</div>}>
                                <NoSuspenseDmInfo
                                    key={dmStreamId}
                                    dmStreamId={dmStreamId}
                                    onDmChange={navigateToDm}
                                />
                            </Suspense>
                        ))}
                    </div>
                    {dmStreamIds.length === 0 && (
                        <p className="pt-4 text-center text-sm text-secondary-foreground">
                            You don't have any direct messages yet.
                        </p>
                    )}
                </>
            }
            main={<Outlet />}
        />
    )
}

const SpaceInfo = ({
    spaceId,
    onSpaceChange,
}: {
    spaceId: string
    onSpaceChange: (spaceId: string) => void
}) => {
    const { data: space } = useSpace(spaceId)
    return (
        <div>
            <Button variant="outline" onClick={() => onSpaceChange(space.id)}>
                {space.metadata?.name || 'Unnamed Space'}
            </Button>
        </div>
    )
}

const GdmInfo = ({
    gdmStreamId,
    onGdmChange,
}: {
    gdmStreamId: string
    onGdmChange: (gdmStreamId: string) => void
}) => {
    const { data: gdm } = useGdm(gdmStreamId)
    return (
        <div>
            <Button variant="outline" onClick={() => onGdmChange(gdm.id)}>
                {gdm.metadata?.name || 'Unnamed Gdm'}
            </Button>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DmInfo = ({
    dmStreamId,
    onDmChange,
}: {
    dmStreamId: string
    onDmChange: (dmStreamId: string) => void
}) => {
    const sync = useSyncAgent()
    const { data: dm } = useDm(dmStreamId)
    const member = useMemo(() => {
        const dm = sync.dms.getDm(dmStreamId)
        // TODO: We may want to move this to the core of react-sdk
        // Adding a `suspense` option to the `useObservable` hook would make this easier.
        const members = suspend(async () => {
            await dm.members.when((x) => x.data.initialized === true)
            return dm.members
        }, [dmStreamId, sync, dm])
        const other = members.data.userIds.find((userId) => userId !== sync.userId)
        if (!other) {
            return members.myself
        }
        return members.get(other)
    }, [dmStreamId, sync])
    const {
        data: { userId, username, displayName },
    } = useObservable(member instanceof Myself ? member.member : member)

    return (
        <button className="flex items-center gap-2" onClick={() => onDmChange(dm.id)}>
            <Avatar userId={userId} className="size-10 border border-neutral-200" />
            <p className="font-mono text-sm font-medium">
                {userId === sync.userId ? 'You' : displayName || username || shortenAddress(userId)}
            </p>
        </button>
    )
}

// Without suspense, we can't wait for initialization.
// In this case, we will default user to be ourselves until the dm is initialized so we can get the correct user
const NoSuspenseDmInfo = ({
    dmStreamId,
    onDmChange,
}: {
    dmStreamId: string
    onDmChange: (dmStreamId: string) => void
}) => {
    const sync = useSyncAgent()
    const { data: dm } = useDm(dmStreamId)
    const { data: members } = useMemberList(dmStreamId)
    const { userId, username, displayName } = useMember({
        streamId: dmStreamId,
        userId: members.userIds.find((userId) => userId !== sync.userId) || sync.userId,
    })

    return (
        <button className="flex items-center gap-2" onClick={() => onDmChange(dm.id)}>
            <Avatar
                key={userId}
                userId={userId}
                className="h-10 w-10 rounded-full border border-neutral-200"
            />
            <p className="font-mono text-sm font-medium">
                {userId === sync.userId ? 'You' : displayName || username || shortenAddress(userId)}
            </p>
        </button>
    )
}

const BotCard = ({ bot }: { bot: BotInfo }) => {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [installOpen, setInstallOpen] = useState(false)
    const { data: metadata, isLoading } = useAppMetadata(bot.app.client)
    const displayName = metadata?.displayName || shortenAddress(bot.app.client)

    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <Avatar
                    isBot
                    userId={bot.app.client}
                    className="h-10 w-10 rounded-full border border-neutral-200"
                />
                <div>
                    <p className="text-sm font-medium">{displayName}</p>
                    {metadata?.description && (
                        <p className="text-xs text-muted-foreground">
                            {metadata.description.substring(0, 40)}
                            {metadata.description.length > 40 && '...'}
                        </p>
                    )}
                    {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
                    <SettingsIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setInstallOpen(true)}>
                    <DownloadIcon className="h-4 w-4" />
                </Button>
            </div>

            <BotSettingsDialog
                appClientId={bot.app.client}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />
            <BotInstallDialog
                appAddress={bot.app.module}
                appClientId={bot.app.client}
                open={installOpen}
                onOpenChange={setInstallOpen}
            />
        </div>
    )
}
