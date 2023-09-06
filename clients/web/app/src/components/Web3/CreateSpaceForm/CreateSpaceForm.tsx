import * as Sentry from '@sentry/react'

import { AnimatePresence, motion } from 'framer-motion'
import {
    CreateSpaceInfo,
    EmittedTransaction,
    Permission,
    RoomVisibility,
    SignerUndefinedError,
    TransactionStatus,
    WalletDoesNotMatchSignedInAccountError,
    useCreateSpaceTransaction,
    useCurrentWalletEqualsSignedInAccount,
    useOnTransactionEmitted,
    useZionClient,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { toast } from 'react-hot-toast/headless'
import { useNavigate } from 'react-router'
import { Box, Button, Heading, MotionBox, Text } from '@ui'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'

import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { FailedUploadAfterSpaceCreation } from '@components/Notifications/FailedUploadAfterSpaceCreation'
import { PATHS } from 'routes'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { TransactionButton } from '@components/TransactionButton'
import { useDevOnlyQueryParams } from 'hooks/useQueryParam'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { useUploadImage } from 'api/lib/uploadImage'
import { useFormSteps } from '../../../hooks/useFormSteps'
import { useCreateSpaceFormStore } from './CreateSpaceFormStore'
import { CreateSpaceStep3 } from './steps/CreateSpaceStep3'
import { CreateSpaceStep2 } from './steps/CreateSpaceStep2'
import { CreateSpaceStep1 } from './steps/CreateSpaceStep1'
import {
    ERROR_INVALID_PARAMETERS,
    ERROR_NAME_CONTAINS_INVALID_CHARACTERS,
    ERROR_NAME_LENGTH_INVALID,
    ERROR_SPACE_ALREADY_REGISTERED,
    EVERYONE,
    TOKEN_HOLDERS,
} from './constants'

type HeaderProps = {
    formId: string
    hasPrev: boolean
    isLast: boolean
    goPrev: () => void
    hasError: boolean
    errorBox: React.ReactNode
    transactionState: TransactionUIState
}

const Header = (props: HeaderProps) => {
    const { hasPrev, goPrev, isLast, formId, transactionState, hasError, errorBox } = props
    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()
    const currentWalletEqualsSignedInAccount = useCurrentWalletEqualsSignedInAccount()
    const isWrongNetwork = !isTransactionNetwork && isLast
    const showBackButton = transactionState == TransactionUIState.None && hasPrev

    return (
        <Box gap>
            <Box horizontal justifyContent="spaceBetween" alignItems="center">
                <Heading level={2}>Create a Town</Heading>
                <Box flexDirection="row" paddingLeft="sm" position="relative" gap="sm">
                    <AnimatePresence>
                        {showBackButton && (
                            <MotionButton
                                animate
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={goPrev}
                            >
                                <Text>Prev</Text>
                            </MotionButton>
                        )}
                    </AnimatePresence>

                    <MotionBox
                        layout
                        paddingLeft="sm"
                        transition={{ duration: 0.2 }}
                        animate={{
                            width: transactionState != TransactionUIState.None ? '250px' : 'auto',
                        }}
                    >
                        <TransactionButton
                            formId={formId}
                            transactionState={transactionState}
                            disabled={isWrongNetwork || !currentWalletEqualsSignedInAccount}
                            idleText={isLast ? 'Mint' : 'Next'}
                            transactingText="Creating Town"
                            successText="Town Created"
                        />
                    </MotionBox>
                </Box>
            </Box>
            {isWrongNetwork && (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <RequireTransactionNetworkMessage
                        postCta="to mint a space."
                        switchNetwork={switchNetwork}
                    />
                </Box>
            )}
            {!isWrongNetwork && !currentWalletEqualsSignedInAccount && (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message="Wallet is not connected, or is not the same as the signed in account." />
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
    const navigate = useNavigate()
    const isCreatingSpace = useRef<boolean>(false)

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
            const errorName = error?.name ?? ''
            switch (true) {
                case errorName === ERROR_NAME_CONTAINS_INVALID_CHARACTERS:
                    errorText =
                        'Space name contains invalid characters. Please update the space name and try again.'
                    break
                case errorName === ERROR_NAME_LENGTH_INVALID:
                    errorText =
                        'The space name must be between 3 and 32 characters. Please update the space name and try again.'
                    break
                case errorName === ERROR_SPACE_ALREADY_REGISTERED:
                    errorText =
                        'The space name is already registered. Please choose a different space name and try again.'
                    break
                case errorName === ERROR_INVALID_PARAMETERS:
                    errorText = 'The space name is invalid. Please try again.'
                    break
                case error instanceof SignerUndefinedError:
                    errorText = 'Wallet is not connected. Please connect your wallet and try again.'
                    break
                case error instanceof WalletDoesNotMatchSignedInAccountError:
                    errorText =
                        'Current wallet is not the same as the signed in account. Please switch your wallet and try again.'
                    break
                default:
                    errorText = 'An unknown error occurred. Cannot save transaction.'
                    break
            }
            const fullErrorText = `Transaction error: ${errorText}`
            return (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message={fullErrorText} />
                </Box>
            )
        }
    }, [error, hasError])

    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(roomId))

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
            isCreatingSpace.current = false
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
            tokens.map((t) => t.contractAddress),
            tokenGrantedPermissions,
            everyonePermissions,
        )
    }, [createSpaceTransactionWithRole])

    const onSubmit = useCallback(async () => {
        if (isCreatingSpace.current) {
            // guard against calling this multiple times while awaiting
            // the completion of the transaction.
            return
        }
        isCreatingSpace.current = true
        try {
            if (isLast) {
                setWentBackAfterAttemptingCreation(false)
                await createSpace()
            } else {
                goNext()
            }
        } finally {
            isCreatingSpace.current = false
        }
    }, [createSpace, goNext, isLast])

    const onTransactionCreated = useCallback(() => {
        roomId && useCreateSpaceFormStore.getState().setCreatedSpaceId(roomId.networkId)
        console.log('[CreateSpaceForm]', 'onTransactionCreated', roomId?.networkId)
    }, [roomId])

    const onTransactionSuccessful = useCallback(() => {
        console.log(
            '[CreateSpaceForm] onTransactionSuccessful, navigate to ',
            `/${PATHS.SPACES}/${roomId?.slug}/${PATHS.GETTING_STARTED}`,
        )
        if (roomId) {
            navigate(`/${PATHS.SPACES}/${roomId.slug}/${PATHS.GETTING_STARTED}`)
        }
    }, [navigate, roomId])

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

    // listen for when transaction status changes, and handle accordingly.
    useEffect(() => {
        if (!transactionHash) {
            return
        }
        switch (transactionStatus) {
            case TransactionStatus.Success:
                onTransactionSuccessful()
                break
            case TransactionStatus.Pending:
                onTransactionCreated()
                break
        }
    }, [transactionStatus, transactionHash, onTransactionSuccessful, onTransactionCreated])

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
                transactionState={transactionUIState}
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

const MotionButton = motion(Button)
