import React, { useState } from 'react'
import { shallow } from 'zustand/shallow'
import { Box, FormRender, Paragraph, Toggle } from '@ui'
import { FormStepProps } from 'hooks/useFormSteps'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { env } from 'utils'
import { useCreateSpaceFormStore } from '../CreateSpaceFormStore'

const DEBUG = env.DEV && false

export const CreateSpaceStep3 = ({ onSubmit, id }: FormStepProps) => {
    const { mintedTokenAddress, name } = useCreateSpaceFormStore(
        (s) => ({
            mintedTokenAddress: s.mintedTokenAddress,
            createdSpaceId: encodeURIComponent(s.createdSpaceId ?? ''),
            name: s.step2.spaceName,
        }),
        shallow,
    )

    const [toggled, setToggled] = useState(false)
    const address =
        !DEBUG || !toggled ? mintedTokenAddress : `0x0123456789abcdef0123456789abcdef01234567`

    const fullHeight = 360
    const containerHeight = 280

    return (
        <>
            <FormRender id={id} onSubmit={onSubmit}>
                {() => {
                    return (
                        <Box data-testid="space-form-3" padding="lg">
                            <Box centerContent style={{ height: fullHeight }}>
                                <Box position="absolute" color="gray2">
                                    <svg
                                        width={containerHeight}
                                        height={containerHeight}
                                        viewBox="0 0 320 320"
                                    >
                                        <rect
                                            x={10}
                                            y={10}
                                            width="300"
                                            height="300"
                                            rx="16"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeDasharray="10 10"
                                            opacity={0.33}
                                        />
                                    </svg>
                                    <Box
                                        position="absolute"
                                        background="level1"
                                        padding="sm"
                                        style={{
                                            top: 10,
                                            left: `50%`,
                                            transform: `translate(-50%,-50%)`,
                                        }}
                                    >
                                        <Paragraph textTransform="uppercase" size="sm">
                                            OWNER’S TOKEN
                                        </Paragraph>
                                    </Box>
                                </Box>
                                <InteractiveTownsToken
                                    mintMode
                                    size="lg"
                                    imageSrc="/townsnft.png"
                                    spaceName={name ?? ''}
                                    address={address ?? undefined}
                                />
                            </Box>
                            {DEBUG && (
                                <Toggle toggled={toggled} onToggle={() => setToggled((t) => !t)} />
                            )}
                        </Box>
                    )
                }}
            </FormRender>
        </>
    )
}
