import React, { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CreateSpaceInfo,
    Membership,
    Permission,
    RoomIdentifier,
    RoomVisibility,
    useCreateSpaceTransaction,
} from 'use-zion-client'
import { Box, Button, Heading, Text } from '@ui'
import { useQueryParams } from 'hooks/useQueryParam'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { TransactionUIStatesType, useTransactionUIStates } from 'hooks/useTransactionStatus'
import { StoredTransactionType } from 'store/transactionsStore'
import { TransactionButton } from '@components/TransactionButton'
import { useSaveTransactionOnCreation } from 'hooks/useSaveTransactionOnSuccess'
import { useOnSuccessfulTransaction } from 'hooks/useOnSuccessfulTransaction'
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
    const { isAbleToInteract } = transactionUIState

    return (
        <>
            <Box flexDirection="row" justifyContent="spaceBetween" paddingY="lg">
                <Heading level={2}> Create Space </Heading>
                <Box flexDirection="row" paddingLeft="sm" position="relative">
                    {hasPrev && (
                        <Box
                            position={!isAbleToInteract ? 'absolute' : 'relative'}
                            left={!isAbleToInteract ? 'md' : 'none'}
                        >
                            <Button onClick={goPrev}>
                                <Text>Prev</Text>
                            </Button>
                        </Box>
                    )}

                    <MotionBox layout paddingLeft="sm" width={!isAbleToInteract ? '250' : 'auto'}>
                        <TransactionButton formId={formId} transactionUIState={transactionUIState}>
                            {isLast && <MotionText layout>Mint</MotionText>}
                            {!isLast && <MotionText layout>Next</MotionText>}
                        </TransactionButton>
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
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()

    const [wentBackAfterAttemptingCreation, setWentBackAfterAttemptingCreation] = useState(false)

    const hasError = useMemo(() => {
        return Boolean(
            error && error.name !== 'ACTION_REJECTED' && !wentBackAfterAttemptingCreation,
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

        await createSpaceTransactionWithRole(
            createSpaceInfo,
            'Member',
            tokens,
            tokenGrantedPermissions,
            everyonePermissions,
        )
    }, [createSpaceTransactionWithRole])

    const onSubmit = useCallback(async () => {
        if (isLast) {
            setWentBackAfterAttemptingCreation(false)
            await createSpace()
            return
        }
        goNext()
    }, [createSpace, goNext, isLast])

    useSaveTransactionOnCreation({
        hash: transactionHash,
        data: roomId?.slug,
        type: StoredTransactionType.CreateChannel,
        status: transactionStatus,
    })

    const onSuccessfulTransaction = useCallback(() => {
        roomId && onCreateSpace(roomId, Membership.Join)
    }, [roomId, onCreateSpace])

    useOnSuccessfulTransaction({
        status: transactionStatus,
        callback: onSuccessfulTransaction,
    })

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
