import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
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
import { shallow } from 'zustand/shallow'
import { toast } from 'react-hot-toast/headless'
import { Box, Button, Heading, Text } from '@ui'
import { useDevOnlyQueryParams } from 'hooks/useQueryParam'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { TransactionUIStatesType, useTransactionUIStates } from 'hooks/useTransactionStatus'
import { TransactionButton } from '@components/TransactionButton'
import { useOnTransactionStages } from 'hooks/useOnTransactionStages'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { FadeInBox } from '@components/Transitions'
import { useUploadImage } from 'api/lib/uploadImage'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { FailedUploadAfterSpaceCreation } from '@components/Notifications/FailedUploadAfterSpaceCreation'
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
        <Box gap>
            <Box horizontal justifyContent="spaceBetween" alignItems="center">
                <Heading level={2}>Create a Town</Heading>
                <Box flexDirection="row" paddingLeft="sm" position="relative">
                    <AnimatePresence>
                        {hasPrev && (
                            <FadeInBox
                                position={!isAbleToInteract ? 'absolute' : 'relative'}
                                left={!isAbleToInteract ? 'md' : 'none'}
                            >
                                <Button animate onClick={goPrev}>
                                    <Text>Prev</Text>
                                </Button>
                            </FadeInBox>
                        )}
                    </AnimatePresence>

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
        </Box>
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

    useEffect(() => {
        if (hasError) {
            Sentry.captureException(
                new Error(`Error creating town: ${error?.name} ${error?.message}`),
            )
        }
    }, [error, hasError])

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

    const { mutate: uploadImage } = useUploadImage(createdSpaceId ?? undefined, {
        onError: () => {
            if (!createdSpaceId) {
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(createdSpaceId)
            toast.custom((t) => (
                <FailedUploadAfterSpaceCreation toast={t} spaceId={createdSpaceId} />
            ))
        },
    })

    const onTransactionEmitted = useCallback(
        async (args: EmittedTransaction) => {
            const spaceId = args.data?.spaceId
            if (spaceId && spaceDapp) {
                // TODO: spaceDapp typing is inferred as `any`
                const spaceInfo = await spaceDapp.getSpaceInfo(spaceId.networkId)
                // space created on chain
                if (spaceInfo && spaceInfo.networkId === createdSpaceId) {
                    const spaceImageData = useCreateSpaceFormStore.getState().spaceImageData
                    if (spaceImageData) {
                        const { setLoadedResource } = useImageStore.getState()
                        // set the image before upload so that it displays immediately
                        setLoadedResource(spaceId.networkId, {
                            imageUrl: spaceImageData.imageUrl,
                        })
                        // upload image in BG
                        uploadImage({
                            id: spaceId.networkId,
                            file: spaceImageData.file,
                            type: 'spaceIcon',
                            imageUrl: spaceImageData.imageUrl,
                        })
                    }
                    // trigger the mint animation
                    setMintedTokenAddress(spaceInfo.address)
                }
            }
        },
        [createdSpaceId, setMintedTokenAddress, spaceDapp, uploadImage],
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
        <Box gap="x4" padding="lg">
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
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.3 }}
                >
                    <StepComponent id={formId} onSubmit={onSubmit} />
                </MotionBox>
            </AnimatePresence>
        </Box>
    )
}
