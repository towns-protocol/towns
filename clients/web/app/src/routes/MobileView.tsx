import React from 'react'
import { Box, Button, Stack, Text } from '@ui'
import { TransitionLogo } from '@components/Logo/Logo'
import { FadeIn } from '@components/Transitions'
import { env } from 'utils'

export const MobileView = () => {
    return (
        <Stack centerContent grow height="100%" gap="lg">
            <TransitionLogo />
            <FadeIn>
                <Stack centerContent minHeight="height_xl" gap="lg" maxWidth="200">
                    <Text textAlign="center">
                        Towns Alpha is currently available only on desktop.
                    </Text>
                    <Text>Btw, do you have an invite?</Text>
                    <Text>Apply here:</Text>
                    <Box horizontal centerContent>
                        <Button
                            tone="cta1"
                            onClick={() => window.open(env.VITE_TYPEFORM_ALPHA_URL)}
                        >
                            Join alpha
                        </Button>
                    </Box>
                </Stack>
            </FadeIn>
        </Stack>
    )
}
