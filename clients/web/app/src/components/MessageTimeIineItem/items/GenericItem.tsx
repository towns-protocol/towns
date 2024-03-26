import React from 'react'
import { TimelineEvent } from 'use-towns-client'
import { RichTextPreview } from '@components/RichText/RichTextPreview'
import { RichTextPreview as PlateRichTextPreview } from '@components/RichTextPlate/RichTextPreview'
import { env } from 'utils'
import { Box } from '@ui'

type Props = {
    event: TimelineEvent
}
export const TimelineGenericEvent = (props: Props) => {
    const { event } = props
    const MessagePreview = env.VITE_ENABLE_SLATE_PREVIEW ? PlateRichTextPreview : RichTextPreview
    return (
        <Box centerContent paddingX="lg" paddingY="sm" color="gray2">
            <MessagePreview content={event.fallbackContent} />
        </Box>
    )
}
