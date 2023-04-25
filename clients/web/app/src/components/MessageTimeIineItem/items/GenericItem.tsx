import React from 'react'
import { TimelineEvent } from 'use-zion-client'
import { RichTextPreview } from '@components/RichText/RichTextEditor'
import { Box } from '@ui'

type Props = {
    event: TimelineEvent
}
export const TimelineGenericEvent = (props: Props) => {
    const { event } = props
    return (
        <Box centerContent paddingX="lg" paddingY="sm" color="gray2">
            <RichTextPreview content={event.fallbackContent} edited={false} />
        </Box>
    )
}
