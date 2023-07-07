import React from 'react'
import { Box, Card, MotionBox, Paragraph } from '@ui'

export const DecryptingCard = (props: { progress: number }) => {
    return (
        <Card border gap padding="lg" background="level1" width="200">
            <Box border height="x1" position="relative" rounded="xs" overflow="hidden">
                <MotionBox
                    position="absolute"
                    height="100%"
                    width="100%"
                    background="inverted"
                    initial={{
                        scaleX: 0,
                        originX: 0,
                    }}
                    animate={{
                        scaleX: props.progress,
                    }}
                />
            </Box>
            <Box centerContent>
                <Paragraph size="sm">Decrypting chat...</Paragraph>
            </Box>
        </Card>
    )
}
