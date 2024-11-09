import { useGdm, useGdmTimeline } from '@river-build/react-sdk'
import { useParams } from 'react-router-dom'
import { Timeline } from '@/components/blocks/timeline'

export const GdmTimelineRoute = () => {
    const { gdmStreamId } = useParams<{ gdmStreamId: string }>()
    const { data: gdm } = useGdm(gdmStreamId!)
    const { data: timeline } = useGdmTimeline(gdmStreamId!)
    return (
        <>
            <h2 className="text-2xl font-bold">
                Group Chat Timeline {gdm.metadata?.name ? `#${gdm.metadata.name}` : ''}
            </h2>
            <Timeline events={timeline} streamId={gdmStreamId!} />
        </>
    )
}
