import { Outlet, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { useGdm, useSpace, useUserGdms, useUserSpaces } from '@river-build/react-sdk'
import { GridSidePanel } from '@/components/layout/grid-side-panel'
import { Button } from '@/components/ui/button'
import { CreateSpace } from '@/components/form/space/create'
import { JoinSpace } from '@/components/form/space/join'
import { ScrollArea } from '@/components/ui/scroll-area'

export const DashboardRoute = () => {
    const navigate = useNavigate()
    const { spaceIds } = useUserSpaces()
    const { streamIds: gdmStreamIds } = useUserGdms()

    const navigateToSpace = useCallback(
        (spaceId: string) => {
            navigate(`/t/${spaceId}`)
        },
        [navigate],
    )

    const navigateToGdm = useCallback(
        (gdmStreamId: string) => {
            navigate(`/m/${gdmStreamId}`)
        },
        [navigate],
    )

    return (
        <GridSidePanel
            side={
                <>
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium">Create Space</h2>
                        <CreateSpace onCreateSpace={navigateToSpace} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium">Join Space</h2>
                        <JoinSpace onJoinSpace={navigateToSpace} />
                    </div>
                    <span className="text-xs">Select a space to start messaging</span>

                    <ScrollArea className="flex h-[calc(100dvh-18rem-50%)]">
                        <div className="flex flex-col gap-1">
                            {spaceIds.map((spaceId) => (
                                <SpaceInfo
                                    key={spaceId}
                                    spaceId={spaceId}
                                    onSpaceChange={navigateToSpace}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {spaceIds.length === 0 && (
                        <p className="pt-4 text-center text-sm text-secondary-foreground">
                            You're not in any spaces yet.
                        </p>
                    )}

                    <hr className="my-2" />

                    <span className="text-xs">Your group chats</span>
                    <ScrollArea className="flex h-[calc(100dvh-18rem-50%)]">
                        <div className="flex flex-col gap-1">
                            {gdmStreamIds.map((gdmStreamId) => (
                                <GdmInfo
                                    key={gdmStreamId}
                                    gdmStreamId={gdmStreamId}
                                    onGdmChange={navigateToGdm}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {gdmStreamIds.length === 0 && (
                        <p className="pt-4 text-center text-sm text-secondary-foreground">
                            You're not in any group chats yet.
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
