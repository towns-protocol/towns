import React from 'react'
import { Box, FormRender } from '@ui'
import { FormStepProps } from 'hooks/useFormSteps'
import { InteractiveSpaceToken } from '@components/SpaceToken/InteractiveSpaceToken'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'

export const CreateSpaceStep3 = ({ onSubmit, id }: FormStepProps) => {
    const s = useCreateSpaceFormStore()
    const name = s.step2.spaceName ?? ''
    const address = ''

    return (
        <FormRender id={id} onSubmit={onSubmit}>
            {() => {
                return (
                    <Box data-testid="space-form-3">
                        <InteractiveSpaceToken name={name} address={address} />
                    </Box>
                )
            }}
        </FormRender>
    )
}
