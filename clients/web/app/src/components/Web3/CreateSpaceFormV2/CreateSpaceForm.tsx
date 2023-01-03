import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CreateSpaceInfo,
    Membership,
    Permission,
    RoomIdentifier,
    RoomVisibility,
    TransactionStatus,
    useCreateSpaceTransaction,
} from 'use-zion-client'
import { Box, Button, Heading, Text } from '@ui'
import { useQueryParams } from 'hooks/useQueryParam'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { FadeIn } from '@components/Transitions'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import {
    TransactionUIStates,
    TransactionUIStatesType,
    useTransactionUIStates,
} from 'hooks/useTransactionStatus'
import { StoredTransactionType, useTransactionStore } from 'store/transactionsStore'
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

type HeaderProps = {
    formId: string
    hasPrev: boolean
    isLast: boolean
    goPrev: () => void
    hasError: boolean
    transactionUIState: TransactionUIStatesType
}

const Header = (props: HeaderProps) => {
    const { hasPrev, goPrev, isLast, formId, transactionUIState, hasError } = props
    const isTransacting = transactionUIState !== TransactionUIStates.None
    const requesting = transactionUIState === TransactionUIStates.Requesting
    const success = transactionUIState === TransactionUIStates.Success
    const failed = transactionUIState === TransactionUIStates.Failed
    const interactiveState = !isTransacting || failed

    return (
        <>
            <Box flexDirection="row" justifyContent="spaceBetween" paddingY="lg">
                <Heading level={2}> Create Space </Heading>
                <Box flexDirection="row" paddingLeft="sm" position="relative">
                    {hasPrev && (
                        <Box
                            position={!interactiveState ? 'absolute' : 'relative'}
                            left={!interactiveState ? 'md' : 'none'}
                        >
                            <Button onClick={goPrev}>
                                <Text>Prev</Text>
                            </Button>
                        </Box>
                    )}

                    <MotionBox layout paddingLeft="sm" width={!interactiveState ? '250' : 'auto'}>
                        <Button
                            data-testid="create-space-next-button"
                            tone={!interactiveState || success ? 'level2' : 'cta1'}
                            disabled={!interactiveState}
                            style={{ opacity: 1, zIndex: 1 }}
                            type="submit"
                            form={formId}
                        >
                            {/* broken up b/c of weird behavior with framer layout warping text */}
                            {!interactiveState && (
                                <FadeIn delay>
                                    <Box flexDirection="row" gap="sm">
                                        <ButtonSpinner />
                                        {requesting && (
                                            <MotionText layout>Waiting For Approval</MotionText>
                                        )}
                                        {!requesting && (
                                            <MotionText layout>Creating Space</MotionText>
                                        )}
                                    </Box>
                                </FadeIn>
                            )}

                            {interactiveState && (
                                <FadeIn delay>
                                    {isLast && <MotionText layout>Mint</MotionText>}
                                    {!isLast && <MotionText layout>Next</MotionText>}
                                </FadeIn>
                            )}
                        </Button>
                    </MotionBox>
                </Box>
            </Box>
            {hasError && (
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
    const {
        data: roomId,
        error,
        transactionHash,
        transactionStatus,
        createSpaceTransactionWithMemberRole,
    } = useCreateSpaceTransaction()
    const storeTransaction = useTransactionStore((state) => state.storeTransaction)

    const [wentBackAfterAttemptingCreation, setWentBackAfterAttemptingCreation] = useState(false)

    const hasError = useMemo(() => {
        return (
            error != undefined &&
            error?.name !== 'ACTION_REJECTED' &&
            !wentBackAfterAttemptingCreation
        )
    }, [error, wentBackAfterAttemptingCreation])

    const transactionUIState = useTransactionUIStates(transactionStatus, Boolean(roomId))

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
        goPrev()
        if (isLast) {
            setWentBackAfterAttemptingCreation(true)
        }
    }

    const createSpace = useCallback(async () => {
        const { step1, step2 } = useCreateSpaceFormStore.getState()

        const { membershipType, tokens } = step1
        const { spaceIconUrl, spaceName } = step2

        if (!membershipType || !spaceName || !spaceIconUrl || !spaceName) {
            return
        }

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

        await createSpaceTransactionWithMemberRole(
            createSpaceInfo,
            tokens,
            tokenGrantedPermissions,
            everyonePermissions,
        )
    }, [createSpaceTransactionWithMemberRole])

    const onSubmit = useCallback(async () => {
        if (isLast) {
            setWentBackAfterAttemptingCreation(false)
            await createSpace()
            return
        }
        goNext()
    }, [createSpace, goNext, isLast])

    useEffect(() => {
        if (transactionHash && transactionStatus === TransactionStatus.Pending) {
            storeTransaction({
                hash: transactionHash,
                data: roomId?.slug,
                type: StoredTransactionType.CreateSpace,
            })
        }

        if (roomId && transactionStatus === TransactionStatus.Success) {
            onCreateSpace(roomId, Membership.Join)
        }
    }, [onCreateSpace, roomId, transactionStatus, transactionHash, storeTransaction])

    return (
        <Box>
            <Header
                formId={formId}
                hasPrev={hasPrev}
                goPrev={onPrevClick}
                isLast={isLast}
                hasError={hasError}
                transactionUIState={transactionUIState}
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
