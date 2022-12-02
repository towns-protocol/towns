import React from 'react'
import { Box, FormRender } from '@ui'
import { FormStepProps } from 'hooks/useFormSteps'

export const CreateSpaceStep3 = ({ onSubmit, id }: FormStepProps) => {
    return (
        <FormRender id={id} onSubmit={onSubmit}>
            {() => {
                return (
                    <Box data-testid="space-form-3">
                        <Box background="level2" rounded="sm" height="300" />
                    </Box>
                )
            }}
        </FormRender>
    )
}
