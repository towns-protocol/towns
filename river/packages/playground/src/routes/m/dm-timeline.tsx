import { useParams } from 'react-router-dom'
import { useDm, useDmTimeline } from '@river-build/react-sdk'
import { Timeline } from '@/components/blocks/timeline'

export const DmTimelineRoute = () => {
    const { dmStreamId } = useParams<{ dmStreamId: string }>()
    const { data: dm } = useDm(dmStreamId!)
    const { data: timeline } = useDmTimeline(dmStreamId!)
    return (
        <>
            <h2 className="text-2xl font-bold">
                Direct Message Timeline {dm.metadata?.name ? `#${dm.metadata.name}` : ''}
            </h2>
            <Timeline events={timeline} type="dm" streamId={dmStreamId!} />
        </>
    )
}
