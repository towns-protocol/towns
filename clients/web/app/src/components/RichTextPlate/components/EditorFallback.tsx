import React from 'react'
import { Box } from '@ui'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'

export const EditorFallback = (props: { error: Error }) => (
    <Box
        horizontal
        gap="sm"
        rounded="sm"
        background="level3"
        height="x6"
        padding="lg"
        alignItems="center"
        color="gray2"
    >
        <SomethingWentWrong error={props.error} />
    </Box>
)
