import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Button, Heading } from '@ui'
import { useQueryParams } from 'hooks/useQueryParam'
import { CreateSpaceStep1 } from './steps/CreateSpaceStep1'
import { CreateSpaceStep2 } from './steps/CreateSpaceStep2'
import { useFormSteps } from '../../../hooks/useFormSteps'
import { CreateSpaceStep3 } from './steps/CreateSpaceStep3'
import { useCreateSpaceFormStore } from './CreateSpaceFormStore'

const MotionBox = motion(Box)

export const CreateSpaceForm = () => {
    const { step } = useQueryParams('step')
    const startAt = step && (step as number) > 0 ? (step as number) - 1 : 0

    const {
        goNext,
        goPrev,
        id: formId,
        isLast,
        hasPrev,
        stepIndex,
        StepComponent,
    } = useFormSteps(
        'create-space',
        [CreateSpaceStep1, CreateSpaceStep2, CreateSpaceStep3],
        startAt,
    )

    function onSubmit() {
        if (isLast) {
            console.log(useCreateSpaceFormStore.getState())
            return
        }
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
