import React, { useCallback, useMemo } from 'react'
import {
    SignerUndefinedError,
    TransactionStatus,
    WalletDoesNotMatchSignedInAccountError,
    useContractSpaceInfo,
    useSpaceData,
    useUpdateSpaceInfoTransaction,
} from 'use-towns-client'
import { z } from 'zod'
import { Box, Button, ErrorMessage, FormRender, Heading, Stack, Text, TextField } from '@ui'
import { TransactionButton } from '@components/TransactionButton'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'
import { isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'

import { buildSpaceMetadataUrl, refreshSpaceCache } from 'api/lib/fetchImage'
import { GetSigner, WalletReady } from 'privy/WalletReady'

type Props = {
    onHide: () => void
    setInvalidationId: (invalidationId: string | undefined) => void
}

const FormStateKeys = {
    name: 'name',
    motto: 'motto',
    about: 'about',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.motto]: string
    [FormStateKeys.about]: string
}

export const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter a town name'),
    [FormStateKeys.motto]: z.string().max(50, 'Town motto cannot exceed 50 characters'),
    [FormStateKeys.about]: z.string().max(5000, 'Town description cannot exceed 5000 characters'),
})

export const TownInfoModal = React.memo((props: Props) => {
    return <TownInfoModalWithoutAuth {...props} />
})

export const TownInfoModalWithoutAuth = (props: Props) => {
    const { onHide, setInvalidationId } = props
    const space = useSpaceData()
    const { data } = useContractSpaceInfo(space?.id)

    const {
        error: transactionError,
        transactionHash,
        transactionStatus,
        updateSpaceInfoTransaction,
    } = useUpdateSpaceInfoTransaction({
        onSuccess: () => (space?.id ? refreshSpaceCache(space.id) : undefined),
    })

    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(data))
    const hasPendingTx = Boolean(transactionUIState != TransactionUIState.None)

    const onSubmit = useCallback(
        async (changes: FormState, getSigner: GetSigner) => {
            const signer = await getSigner()
            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            if (!data?.networkId) {
                return
            }

            const txResult = await updateSpaceInfoTransaction(
                data.networkId,
                changes[FormStateKeys.name],
                buildSpaceMetadataUrl(data.address),
                changes[FormStateKeys.motto],
                changes[FormStateKeys.about],
                signer,
            )
            if (txResult?.status === TransactionStatus.Success) {
                onHide()
                const { invalidationId } = await refreshSpaceCache(data.networkId)
                setInvalidationId(invalidationId)
            }
        },
        [data?.networkId, data?.address, updateSpaceInfoTransaction, onHide, setInvalidationId],
    )

    const hasTransactionError = Boolean(
        transactionError && transactionHash && !isRejectionError(transactionError),
    )
    const hasServerError = Boolean(
        transactionError && !transactionHash && !isRejectionError(transactionError),
    )
    const defaultValues = {
        [FormStateKeys.name]: data ? data.name : '',
        [FormStateKeys.motto]: data?.shortDescription,
        [FormStateKeys.about]: data?.longDescription,
    }

    const errorBox = useMemo(() => {
        let errMsg: string | undefined = undefined
        switch (true) {
            case transactionError instanceof SignerUndefinedError:
                errMsg = 'Wallet is not connected'
                break
            case transactionError instanceof WalletDoesNotMatchSignedInAccountError:
                errMsg = 'Current wallet is not the same as the signed in account'
                break
            case transactionError && hasServerError:
                if (transactionError && isForbiddenError(transactionError)) {
                    errMsg = "You don't have permission to this town"
                } else {
                    errMsg = 'There was an error updating the town'
                }
                break
            case hasTransactionError:
                errMsg = 'There was an error with the transaction. Please try again'
                break
            default:
                errMsg = undefined
                break
        }
        if (errMsg) {
            return (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message={errMsg} />
                </Box>
            )
        }
        return null
    }, [hasServerError, hasTransactionError, transactionError])

    return (
        <>
            <ModalContainer onHide={onHide}>
                <Stack gap="lg">
                    <Heading level={3}>Edit Town</Heading>

                    <FormRender<FormState>
                        schema={schema}
                        defaultValues={defaultValues}
                        mode="onChange"
                    >
                        {({ register, formState, watch, handleSubmit }) => {
                            watch()
                            return (
                                <Stack grow gap="sm">
                                    <Stack>
                                        <TextField
                                            autoFocus
                                            background="level2"
                                            label="Name"
                                            placeholder="Name your town"
                                            maxLength={30}
                                            message={
                                                <ErrorMessage
                                                    errors={formState.errors}
                                                    fieldName={FormStateKeys.name}
                                                />
                                            }
                                            {...register(FormStateKeys.name)}
                                        />
                                    </Stack>
                                    <Stack alignContent="start">
                                        <TextField
                                            background="level2"
                                            label="Town Motto"
                                            placeholder="Add town motto"
                                            maxLength={50}
                                            message={
                                                <ErrorMessage
                                                    errors={formState.errors}
                                                    fieldName={FormStateKeys.motto}
                                                />
                                            }
                                            disabled={hasPendingTx}
                                            {...register(FormStateKeys.motto, {
                                                required: true,
                                                maxLength: 50,
                                            })}
                                        />
                                    </Stack>
                                    <Stack>
                                        <Text strong>About</Text>
                                        <Box
                                            as="textarea"
                                            background="level2"
                                            color="default"
                                            padding="md"
                                            rounded="sm"
                                            marginTop="md"
                                            style={{
                                                width: '100%',
                                                minHeight: '120px',
                                                resize: 'vertical',
                                            }}
                                            maxLength={5000}
                                            placeholder="Add town description"
                                            disabled={hasPendingTx}
                                            {...register(FormStateKeys.about, {
                                                required: true,
                                                maxLength: 5000,
                                            })}
                                        />
                                        <ErrorMessage
                                            errors={formState.errors}
                                            fieldName={FormStateKeys.about}
                                        />
                                    </Stack>

                                    <Box flexDirection="row" justifyContent="end" gap="sm">
                                        <Stack horizontal gap justifyContent="end">
                                            <Button
                                                tone="level2"
                                                value="Cancel"
                                                disabled={hasPendingTx}
                                                onClick={onHide}
                                            >
                                                Cancel
                                            </Button>

                                            <WalletReady>
                                                {({ getSigner }) => (
                                                    <TransactionButton
                                                        transactionState={transactionUIState}
                                                        transactingText="Updating town"
                                                        successText="Town updated"
                                                        idleText="Save on chain"
                                                        onClick={handleSubmit((data) =>
                                                            onSubmit(data, getSigner),
                                                        )}
                                                    />
                                                )}
                                            </WalletReady>
                                        </Stack>
                                    </Box>
                                    {errorBox}
                                </Stack>
                            )
                        }}
                    </FormRender>
                </Stack>
            </ModalContainer>
        </>
    )
}
