import { useNavigate } from 'react-router'
import { useSpaceContext, useZionClient, useZionContext } from 'use-zion-client'
import { useShortcut } from 'hooks/useShortcut'
import { PATHS } from 'routes'
import { useCreateLink } from 'hooks/useCreateLink'

export const RegisterMainShortcuts = () => {
    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()

    const currentSpaceIndex = spaces.findIndex((s) => s.id.streamId === spaceId?.streamId)
    const numSpaces = spaces.length
    const navigate = useNavigate()

    const incrementSpace = (increment: -1 | 1) => {
        const index = (currentSpaceIndex + increment + numSpaces) % numSpaces
        navigate(`/${PATHS.SPACES}/${spaces[index].id.streamId}/`)
    }

    const { createLink } = useCreateLink()

    useShortcut(
        'NavigateToPreviousTown',
        () => {
            incrementSpace(-1)
        },
        { preventDefault: true },
        [incrementSpace],
    )

    useShortcut(
        'NavigateToNextTown',
        () => {
            incrementSpace(1)
        },
        { preventDefault: true },
        [incrementSpace],
    )
    useShortcut('CreateNewTown', () => {
        navigate(`/${PATHS.SPACES}/new`)
    })

    const { resetFullyReadMarkers } = useZionClient()

    useShortcut('ClearAllUnreads', () => {
        resetFullyReadMarkers()
    })

    useShortcut('DisplayTownInfo', () => {
        if (!spaceId) {
            return
        }
        const path = createLink({ spaceId: spaceId.streamId, panel: 'townInfo' })
        if (path) {
            navigate(path)
        }
    })

    return null
}
