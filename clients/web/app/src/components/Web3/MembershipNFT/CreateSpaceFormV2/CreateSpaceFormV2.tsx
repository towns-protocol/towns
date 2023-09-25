import React from 'react'
import { Stack } from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'

export function CreateSpaceFormV2() {
    const imageSrc = '/placeholders/pioneer.png'

    return (
        <Stack horizontal grow borderTop position="relative">
            <BlurredBackground imageSrc={imageSrc} blur={40} />
        </Stack>
    )
}
