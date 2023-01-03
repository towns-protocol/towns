import React, { useCallback, useEffect, useState } from 'react'
import { useZionClient } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { Box, FormRender } from '@ui'
import { FormStepProps } from 'hooks/useFormSteps'
import { InteractiveSpaceToken } from '@components/SpaceToken/InteractiveSpaceToken'
import { PATHS } from 'routes'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'
import { CreateSpaceEventListener } from '../CreateSpaceListener'

export const CreateSpaceStep3 = ({ onSubmit, id }: FormStepProps) => {
    const s = useCreateSpaceFormStore()
    const name = s.step2.spaceName ?? ''
    const { spaceManager } = useZionClient()
    const navigate = useNavigate()
    const [animationAddress, setAnimationAddress] = useState('')

    const mintedTokenAddress = useCreateSpaceFormStore((s) => s.mintedTokenAddress)
    const createdSpaceId = useCreateSpaceFormStore((s) => s.createdSpaceId)

    const onAnimationComplete = useCallback(() => {
        navigate(`/${PATHS.SPACES}/${createdSpaceId}/`)
    }, [createdSpaceId, navigate])

    useEffect(() => {
        if (mintedTokenAddress && createdSpaceId && !animationAddress) {
            setAnimationAddress(mintedTokenAddress)
        }
    }, [createdSpaceId, mintedTokenAddress, animationAddress])

    return (
        <>
            {spaceManager?.eventsAbi && <CreateSpaceEventListener spaceManager={spaceManager} />}
            <FormRender id={id} onSubmit={onSubmit}>
                {() => {
                    return (
                        <Box data-testid="space-form-3">
                            <InteractiveSpaceToken
                                name={name}
                                address={animationAddress}
                                onAnimationComplete={onAnimationComplete}
                            />
                        </Box>
                    )
                }}
            </FormRender>
        </>
    )
}
