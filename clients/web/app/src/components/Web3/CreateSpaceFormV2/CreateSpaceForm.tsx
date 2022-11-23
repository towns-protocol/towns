import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Button, Heading } from '@ui'
import { CreateSpaceStep1 } from './steps/CreateSpaceStep1'
import { CreateSpaceStep2 } from './steps/CreateSpaceStep2'
import { useFormSteps } from '../../../hooks/useFormSteps'

const MotionBox = motion(Box)

export const CreateSpaceForm = () => {
    const {
        goNext,
        goPrev,
        id: formId,
        hasPrev,
        stepIndex,
        StepComponent,
    } = useFormSteps('create-space', [CreateSpaceStep1, CreateSpaceStep2])

    function onSubmit() {
        goNext()
    }

    return (
        <Box>
            <Box flexDirection="row" justifyContent="spaceBetween" paddingBottom="lg">
                <Heading level={2}> Create Space </Heading>
                <Box flexDirection="row">
                    {hasPrev && (
                        <Box paddingRight="sm">
                            <Button onClick={goPrev}>Prev</Button>
                        </Box>
                    )}
                    <Button tone="cta1" type="submit" form={formId}>
                        Next
                    </Button>
                </Box>
            </Box>
            <Box paddingTop="lg" paddingBottom="md">
                <Heading level={3}> Who can join your space? </Heading>
            </Box>

            <AnimatePresence mode="wait">
                <MotionBox
                    key={stepIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <StepComponent id={formId} onSubmit={onSubmit} />
                </MotionBox>
            </AnimatePresence>
        </Box>
    )
}
