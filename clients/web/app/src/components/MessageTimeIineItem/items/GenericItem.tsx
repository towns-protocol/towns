import React from 'react'
import { TimelineEvent } from '@river-build/sdk'
import { RichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { Box } from '@ui'

type Props = {
    event: TimelineEvent
}
export const TimelineGenericEvent = (props: Props) => {
    const { event } = props
    return (
        <Box centerContent paddingX="lg" paddingY="sm" color="gray2">
            <RichTextPreview content={event.fallbackContent} />
        </Box>
    )
}
