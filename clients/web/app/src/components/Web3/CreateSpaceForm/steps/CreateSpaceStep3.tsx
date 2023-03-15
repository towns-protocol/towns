import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { shallow } from 'zustand/shallow'
import { Box, FormRender } from '@ui'
import { FormStepProps } from 'hooks/useFormSteps'
import { PATHS } from 'routes'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'

export const CreateSpaceStep3 = ({ onSubmit, id }: FormStepProps) => {
    const navigate = useNavigate()
    const { mintedTokenAddress, createdSpaceId, name } = useCreateSpaceFormStore(
        (s) => ({
            mintedTokenAddress: s.mintedTokenAddress,
            createdSpaceId: s.createdSpaceId,
            name: s.step2.spaceName,
        }),
        shallow,
    )

    const onAnimationComplete = useCallback(() => {
        navigate(`/${PATHS.SPACES}/${createdSpaceId}/${PATHS.GETTING_STARTED}`)
    }, [navigate, createdSpaceId])

    return (
        <>
            <FormRender id={id} onSubmit={onSubmit}>
                {() => {
                    return (
                        <Box data-testid="space-form-3">
                            <InteractiveTownsToken
                                mintMode
                                size="lg"
                                spaceName={name ?? ''}
                                address={mintedTokenAddress ?? undefined}
                                onAnimationComplete={onAnimationComplete}
                            />
                        </Box>
                    )
                }}
            </FormRender>
        </>
    )
}
