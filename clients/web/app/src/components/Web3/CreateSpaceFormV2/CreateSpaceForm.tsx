import React, { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CreateSpaceInfo,
    Membership,
    Permission,
    RoomIdentifier,
    RoomVisibility,
    useIntegratedSpaceManagement,
} from 'use-zion-client'
import { Box, Button, Heading, Text } from '@ui'
import { useQueryParams } from 'hooks/useQueryParam'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn } from '@components/Transitions'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { CreateSpaceStep1 } from './steps/CreateSpaceStep1'
import { CreateSpaceStep2 } from './steps/CreateSpaceStep2'
import { useFormSteps } from '../../../hooks/useFormSteps'
import { CreateSpaceStep3 } from './steps/CreateSpaceStep3'
import { useCreateSpaceFormStore } from './CreateSpaceFormStore'
import { EVERYONE, TOKEN_HOLDERS } from './constants'

const MotionBox = motion(Box)
const MotionText = motion(Text)

interface Props {
    onCreateSpace: (roomId: RoomIdentifier, membership: Membership) => void
}

enum TransactionStates {
    Approving = 'Approving',
    Pending = 'Pending',
    Completed = 'Completed',
}

type HeaderProps = {
    formId: string
    hasPrev: boolean
    goPrev: () => void
    error: boolean
    transactionState: TransactionStates | null
}

const Header = (props: HeaderProps) => {
    const { hasPrev, goPrev, formId, transactionState, error } = props
    const isTransacting = transactionState !== null

    return (
        <>
            <Box flexDirection="row" justifyContent="spaceBetween" paddingBottom="lg">
                <Heading level={2}> Create Space </Heading>
                <Box flexDirection="row" paddingLeft="sm" position="relative">
                    {hasPrev && (
                        <Box
                            position={isTransacting ? 'absolute' : 'relative'}
                            left={isTransacting ? 'md' : 'none'}
                        >
                            <Button onClick={goPrev}>
                                <Text>Prev</Text>
                            </Button>
                        </Box>
                    )}

                    <MotionBox layout paddingLeft="sm" width={isTransacting ? '250' : 'auto'}>
                        <Button
                            tone={isTransacting ? 'level2' : 'cta1'}
                            disabled={isTransacting}
                            style={{ opacity: 1, zIndex: 1 }}
                            type="submit"
                            form={formId}
                        >
                            {isTransacting && (
                                <FadeIn delay>
                                    <Box flexDirection="row" gap="sm">
                                        <ButtonSpinner />
                                        <MotionText layout>Waiting for Approval</MotionText>
                                    </Box>
                                </FadeIn>
                            )}

                            {!isTransacting && (
                                <FadeIn delay>
                                    <MotionText layout>Next</MotionText>
                                </FadeIn>
                            )}
                        </Button>
                    </MotionBox>
                </Box>
            </Box>
            {error && (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message="There was an error with the transaction. Please try again" />
                </Box>
            )}
        </>
    )
}

export const CreateSpaceForm = (props: Props) => {
    const { onCreateSpace } = props
    const { step } = useQueryParams('step')
    const startAt = step && (step as number) > 0 ? (step as number) - 1 : 0
    const { createSpaceWithMemberRole } = useIntegratedSpaceManagement()
    const [transactionState, setTransactionState] = useState<TransactionStates | null>(null)
    const [error, setError] = useState(false)

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

    function onPrevClick() {
        if (error) {
            setError(false)
        }
        goPrev()
    }

    const createSpace = useCallback(async () => {
        const { step1, step2 } = useCreateSpaceFormStore.getState()

        const { membershipType, tokens } = step1
        const { spaceIconUrl, spaceName } = step2

        if (!membershipType || !spaceName || !spaceIconUrl || !spaceName) {
            return
        }

        setTransactionState(TransactionStates.Pending)
        setError(false)

        const tokenGrantedPermissions =
            membershipType === TOKEN_HOLDERS ? [Permission.Read, Permission.Write] : []

        const everyonePermissions =
            membershipType === EVERYONE ? [Permission.Read, Permission.Write] : []

        const createSpaceInfo: CreateSpaceInfo = {
            name: spaceName,
            visibility: RoomVisibility.Public,
            // TODO
            // iconUrl: step2.spaceIcon as string,
        }

        try {
            const roomId = await createSpaceWithMemberRole(
                createSpaceInfo,
                tokens,
                tokenGrantedPermissions,
                everyonePermissions,
            )
            // success
            if (roomId) {
                onCreateSpace(roomId, Membership.Join)
            }
            // failure
            else {
                console.error('Failed to create space')
                setError(true)
            }
        } finally {
            setTransactionState(null)
        }
    }, [createSpaceWithMemberRole, onCreateSpace])

    const onSubmit = useCallback(async () => {
        if (isLast) {
            await createSpace()
            return
        }
        goNext()
    }, [createSpace, goNext, isLast])

    return (
        <Box>
            <Header
                formId={formId}
                hasPrev={hasPrev}
                goPrev={onPrevClick}
                error={error}
                transactionState={transactionState}
            />

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
