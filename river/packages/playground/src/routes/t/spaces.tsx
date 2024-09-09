import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { useSpace, useUserSpaces } from '@river-build/react-sdk'
import { GridSidePanel } from '@/components/layout/grid-side-panel'
import { Button } from '@/components/ui/button'
import { CreateSpace } from '@/components/form/space/create'
import { JoinSpace } from '@/components/form/space/join'
import { ScrollArea } from '@/components/ui/scroll-area'

export const SelectSpaceRoute = () => {
    const navigate = useNavigate()
    const { spaceIds } = useUserSpaces()

    const onSpaceChange = useCallback(
        (spaceId: string) => {
            navigate(`/t/${spaceId}`)
        },
        [navigate],
    )

    return (
        <GridSidePanel
            side={
                <>
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium">Create Space</h2>
                        <CreateSpace onCreateSpace={onSpaceChange} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium">Join Space</h2>
                        <JoinSpace onJoinSpace={onSpaceChange} />
                    </div>
                    <span className="text-xs">Select a space to start messaging</span>

                    <ScrollArea className="flex h-[calc(100dvh-18rem)]">
                        <div className="flex flex-col gap-1">
                            {spaceIds.map((spaceId) => (
                                <SpaceInfo
                                    key={spaceId}
                                    spaceId={spaceId}
                                    onSpaceChange={onSpaceChange}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {spaceIds.length === 0 && (
                        <p className="pt-4 text-center text-sm text-secondary-foreground">
                            You're not in any spaces yet.
                        </p>
                    )}
                </>
            }
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
