import React, { useCallback, useMemo } from 'react'
import {
    SignerUndefinedError,
    TransactionStatus,
    WalletDoesNotMatchSignedInAccountError,
    useCurrentWalletEqualsSignedInAccount,
    useSpaceData,
    useUpdateSpaceNameTransaction,
} from 'use-zion-client'
import { z } from 'zod'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Box, Button, ErrorMessage, FormRender, Heading, Stack, TextField } from '@ui'
import { TransactionButton } from '@components/TransactionButton'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useContractSpaceInfo } from 'hooks/useContractSpaceInfo'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'

type Props = {
    onHide: () => void
}

const FormStateKeys = {
    name: 'name',
} as const

type FormState = {
    [FormStateKeys.name]: string
}

export const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter a town name'),
})

export const SpaceNameModal = (props: Props) => {
    const { onHide } = props
    const space = useSpaceData()
    const { data } = useContractSpaceInfo(space?.id?.networkId)

    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()
    const currentWalletEqualsSignedInAccount = useCurrentWalletEqualsSignedInAccount()
    const isDisabled = !isTransactionNetwork || !currentWalletEqualsSignedInAccount

    const {
        error: transactionError,
        transactionHash,
        transactionStatus,
        updateSpaceNameTransaction,
    } = useUpdateSpaceNameTransaction()

    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(data))

    const getSigner = useGetEmbeddedSigner()

    const onSubmit = useCallback(
        async (changes: FormState) => {
            const signer = await getSigner()
            if (!signer) {
                throw new SignerUndefinedError()
            }
            if (!data?.networkId) {
                return
            }

            const txResult = await updateSpaceNameTransaction(
                data?.networkId,
                changes[FormStateKeys.name],
                signer,
            )
            console.log('[SpaceNameModal] txResult', txResult)
            if (txResult?.status === TransactionStatus.Success) {
                onHide()
            }
        },
        [data?.networkId, updateSpaceNameTransaction, getSigner, onHide],
    )

    const hasTransactionError = Boolean(
        transactionError && transactionHash && !isRejectionError(transactionError),
    )
    const hasServerError = Boolean(
        transactionError && !transactionHash && !isRejectionError(transactionError),
    )
    const defaultValues = { [FormStateKeys.name]: data ? data.name : '' }

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
        <ModalContainer onHide={onHide}>
            <Stack gap="lg">
                <Heading level={3}>Edit Town</Heading>

                <FormRender<FormState>
                    schema={schema}
                    defaultValues={defaultValues}
                    mode="onChange"
                    onSubmit={onSubmit}
                >
                    {({ register, formState }) => {
                        const { ...restOfNameProps } = register(FormStateKeys.name)
                        return (
                            <Stack gap>
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
                                    {...restOfNameProps}
                                />

                                <Box flexDirection="row" justifyContent="end" gap="sm">
                                    <Stack horizontal gap justifyContent="end">
                                        <Button
                                            tone="level2"
                                            value="Cancel"
                                            disabled={
                                                isDisabled ||
                                                transactionUIState != TransactionUIState.None
                                            }
                                            onClick={onHide}
                                        >
                                            Cancel
                                        </Button>

                                        <TransactionButton
                                            disabled={isDisabled}
                                            transactionState={transactionUIState}
                                            transactingText="Updating town"
                                            successText="Town updated"
                                            idleText="Save on chain"
                                        />
                                    </Stack>
                                </Box>
                                {errorBox}
                            </Stack>
                        )
                    }}
                </FormRender>
                {!isTransactionNetwork && (
                    <Box paddingTop="md" flexDirection="row" justifyContent="end">
                        <RequireTransactionNetworkMessage
                            postCta="to update a town."
                            switchNetwork={switchNetwork}
                        />
                    </Box>
                )}
                {isTransactionNetwork && !currentWalletEqualsSignedInAccount && (
                    <Box paddingTop="md" flexDirection="row" justifyContent="end">
                        <ErrorMessageText message="Wallet is not connected, or is not the same as the signed in account." />
                    </Box>
                )}
            </Stack>
        </ModalContainer>
    )
}
