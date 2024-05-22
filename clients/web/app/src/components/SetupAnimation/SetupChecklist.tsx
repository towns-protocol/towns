import React from 'react'
import { Box, Icon, MotionBox, Paragraph } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

export const SetupChecklist = (props: { steps: string[]; step: number }) => {
    return (
        <MotionBox
            gap="sm"
            width="100%"
            padding="sm"
            initial="hide"
            animate="show"
            exit="hide"
            transition={{ staggerChildren: 0.2 }}
        >
            {props.steps.map((step, index) => (
                <ChecklistStep
                    key={step}
                    step={step}
                    state={index === props.step ? 'progress' : index < props.step ? 'done' : 'todo'}
                />
            ))}
        </MotionBox>
    )
}

const ChecklistStep = (props: { step: string; state: 'progress' | 'done' | 'todo' }) => {
    return (
        <MotionBox
            gap
            horizontal
            variants={{
                hide: { opacity: 0, y: 5 },
                show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6 }}
            padding="sm"
        >
            <Box centerContent height="x4" width="x4">
                {props.state === 'done' ? (
                    <Checkmark />
                ) : props.state === 'progress' ? (
                    <ButtonSpinner />
                ) : (
                    ''
                )}
            </Box>
            <MotionBox
                justifyContent="center"
                animate={{ opacity: props.state === 'todo' ? 0.5 : 1 }}
            >
                <Paragraph fontWeight="medium">{props.step}</Paragraph>
            </MotionBox>
        </MotionBox>
    )
}

const Checkmark = () => (
    <MotionBox
        centerContent
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        width="x3"
        aspectRatio="1/1"
        borderRadius="full"
        background="positive"
    >
        <Icon type="check" size="square_xs" />
    </MotionBox>
)
