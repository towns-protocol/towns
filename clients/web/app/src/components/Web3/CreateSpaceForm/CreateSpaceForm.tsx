import React, { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CreateSpaceInfo,
    EmittedTransaction,
    Permission,
    RoomVisibility,
    useCreateSpaceTransaction,
    useOnTransactionEmitted,
    useZionClient,
} from 'use-zion-client'
import shallow from 'zustand/shallow'
import { Box, Button, Heading, Text } from '@ui'
import { useDevOnlyQueryParams } from 'hooks/useQueryParam'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { TransactionUIStatesType, useTransactionUIStates } from 'hooks/useTransactionStatus'
import { TransactionButton } from '@components/TransactionButton'
import { useOnTransactionStages } from 'hooks/useOnTransactionStages'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { CreateSpaceStep1 } from './steps/CreateSpaceStep1'
import { CreateSpaceStep2 } from './steps/CreateSpaceStep2'
import { useFormSteps } from '../../../hooks/useFormSteps'
import { CreateSpaceStep3 } from './steps/CreateSpaceStep3'
import { useCreateSpaceFormStore } from './CreateSpaceFormStore'
import {
    ERROR_INVALID_PARAMETERS,
    ERROR_NAME_CONTAINS_INVALID_CHARACTERS,
    ERROR_NAME_LENGTH_INVALID,
    ERROR_SPACE_ALREADY_REGISTERED,
    EVERYONE,
    TOKEN_HOLDERS,
} from './constants'

const MotionBox = motion(Box)
const MotionText = motion(Text)

type HeaderProps = {
    formId: string
    hasPrev: boolean
    isLast: boolean
    goPrev: () => void
    hasError: boolean
    errorBox: React.ReactNode
    transactionUIState: TransactionUIStatesType
}

const Header = (props: HeaderProps) => {
    const { hasPrev, goPrev, isLast, formId, transactionUIState, hasError, errorBox } = props
    const { isAbleToInteract } = transactionUIState
    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()
    const isDisabled = !isTransactionNetwork && isLast
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
                        <TransactionButton
                            formId={formId}
                            transactionUIState={transactionUIState}
                            disabled={isDisabled}
                        >
                            {isLast && <MotionText layout>Mint</MotionText>}
                            {!isLast && <MotionText layout>Next</MotionText>}
                        </TransactionButton>
                    </MotionBox>
                </Box>
            </Box>
            {isDisabled && (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <RequireTransactionNetworkMessage
                        postCta="to mint a space."
                        switchNetwork={switchNetwork}
                    />
                </Box>
            )}
            {hasError && errorBox}
        </>
    )
}

export const CreateSpaceForm = () => {
    const { spaceDapp } = useZionClient()
    const { step } = useDevOnlyQueryParams('step')
    const startAt = step && (step as number) > 0 ? (step as number) - 1 : 0
    const {
        data: roomId,
        error,
        transactionStatus,
        transactionHash,
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()

    const [wentBackAfterAttemptingCreation, setWentBackAfterAttemptingCreation] = useState(false)
    const hasError = useMemo(() => {
        return Boolean(
            error && error.name !== 'ACTION_REJECTED' && !wentBackAfterAttemptingCreation,
        )
    }, [error, wentBackAfterAttemptingCreation])

    const errorBox = useMemo(() => {
        if (hasError) {
            let errorText = ''
            switch (error?.name) {
                case ERROR_NAME_CONTAINS_INVALID_CHARACTERS:
                    errorText = 'The space name contains invalid characters.'
                    break
                case ERROR_NAME_LENGTH_INVALID:
                    errorText = 'The space name must be between 3 and 32 characters.'
                    break
                case ERROR_SPACE_ALREADY_REGISTERED:
                    errorText = 'The space name is already registered.'
                    break
                case ERROR_INVALID_PARAMETERS:
                    errorText = 'The space name is invalid.'
                    break
                default:
                    errorText = 'An unknown error occurred.'
                    break
            }
            const fullErrorText = `There was an error with the transaction! ${errorText} Please try again.`
            return (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message={fullErrorText} />
                </Box>
            )
        }
    }, [error, hasError])

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
        const { spaceName } = step2

        if (!membershipType || !spaceName || !spaceName) {
            return
        }

        const tokenGrantedPermissions =
            membershipType === TOKEN_HOLDERS ? [Permission.Read, Permission.Write] : []

        const everyonePermissions =
            membershipType === EVERYONE ? [Permission.Read, Permission.Write] : []

        const createSpaceInfo: CreateSpaceInfo = {
            name: spaceName,
            visibility: RoomVisibility.Public,
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

    const onTransactionCreated = useCallback(() => {
        roomId && useCreateSpaceFormStore.getState().setCreatedSpaceId(roomId.networkId)
    }, [roomId])

    const { createdSpaceId, setMintedTokenAddress } = useCreateSpaceFormStore(
        (state) => ({
            createdSpaceId: state.createdSpaceId,
            setMintedTokenAddress: state.setMintedTokenAddress,
        }),
        shallow,
    )

    const onTransactionEmitted = useCallback(
        async (args: EmittedTransaction) => {
            const spaceId = args.data?.spaceId
            if (spaceId && spaceDapp) {
                // TODO: spaceDapp typing is inferred as `any`
                const spaceInfo = await spaceDapp.getSpaceInfo(spaceId.networkId)
                if (spaceInfo && spaceInfo.networkId === createdSpaceId) {
                    setMintedTokenAddress(spaceInfo.address)
                }
            }
        },
        [createdSpaceId, setMintedTokenAddress, spaceDapp],
    )

    // listen for when transaction is created
    useOnTransactionStages({
        transactionHash,
        transactionStatus,
        onCreate: onTransactionCreated,
    })

    // listen for when transaction is emitted from store
    useOnTransactionEmitted(onTransactionEmitted)

    return (
        <Box>
            <Header
                formId={formId}
                hasPrev={hasPrev}
                goPrev={onPrevClick}
                isLast={isLast}
                hasError={hasError}
                errorBox={errorBox}
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
