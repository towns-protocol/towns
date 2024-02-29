import {
    BlockchainTransactionType,
    Permission,
    SignerUndefinedError,
    TransactionStatus,
    UpdateChannelInfo,
    WalletDoesNotMatchSignedInAccountError,
    useIsTransactionPending,
    useRoom,
    useUpdateChannelTransaction,
} from 'use-zion-client'
import React, { useCallback, useMemo, useState } from 'react'
import { useGetEmbeddedSigner } from '@towns/privy'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { Box, Button, Checkbox, ErrorMessage, FormRender, Heading, Stack, TextField } from '@ui'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'

import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { TransactionButton } from '@components/TransactionButton'
import { useAllRoleDetails } from 'hooks/useAllRoleDetails'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { mapToErrorMessage } from '@components/Web3/utils'
import { FormState, FormStateKeys, emptyDefaultValues, schema } from './formConfig'
import { ModalContainer } from '../Modals/ModalContainer'
import { RoleCheckboxProps, RolesSection, getCheckedValuesForRoleIdsField } from './RolesSection'

type ChannelSettingsModalProps = {
    spaceId: string
    channelId: string
    onHide: () => void
    onUpdatedChannel: () => void
}

export function ChannelSettingsForm({
    spaceId,
    channelId,
    onHide,
    onUpdatedChannel,
    preventCloseMessage,
}: ChannelSettingsModalProps & {
    preventCloseMessage: string | undefined
}): JSX.Element {
    const room = useRoom(channelId)
    console.log('[ChannelSettingsModal] room', room)
    const { data, isLoading, invalidateQuery } = useAllRoleDetails(spaceId)

    const rolesWithDetails = useMemo((): RoleCheckboxProps[] | undefined => {
        if (isLoading) {
            return undefined
        }
        return data
            ?.filter((role) => role.permissions.includes(Permission.Read))
            .map((role) => {
                const channelHasRole = role.channels.some((c) => c.channelNetworkId === channelId)
                return {
                    ...role,
                    channelHasRole,
                    tokenAddresses: role.tokens.map((token) => token.contractAddress as string),
                }
            })
    }, [data, channelId, isLoading])

    const defaultValues = useMemo((): FormState => {
        if (room) {
            return {
                [FormStateKeys.name]: room.name,
                [FormStateKeys.description]: room.topic,
                // default values for this field are monitored and reset within RolesSection
                [FormStateKeys.roleIds]: getCheckedValuesForRoleIdsField(rolesWithDetails ?? []),
                [FormStateKeys.isDefault]: room.isDefault,
            }
        }
        return emptyDefaultValues
    }, [room, rolesWithDetails])

    const {
        updateChannelTransaction,
        error: transactionError,
        transactionStatus,
        transactionHash,
    } = useUpdateChannelTransaction()

    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(channelId))

    const { hasTransactionError, hasServerError } = useMemo(() => {
        return {
            hasTransactionError: Boolean(
                transactionError && transactionHash && !isRejectionError(transactionError),
            ),
            hasServerError: Boolean(
                transactionError && !transactionHash && !isRejectionError(transactionError),
            ),
        }
    }, [transactionError, transactionHash])

    const getSigner = useGetEmbeddedSigner()

    const onSubmit = useCallback(
        async (changes: FormState) => {
            const signer = await getSigner()
            if (!signer) {
                throw new SignerUndefinedError()
            }
            if (transactionUIState === TransactionUIState.None) {
                const name = changes[FormStateKeys.name]
                const description = changes[FormStateKeys.description]
                const roleIds = changes[FormStateKeys.roleIds].map((roleId) => Number(roleId))
                const isDefault = changes[FormStateKeys.isDefault]
                const channelInfo: UpdateChannelInfo = {
                    parentSpaceId: spaceId,
                    channelId,
                    updatedChannelName: name,
                    updatedChannelTopic: description,
                    updatedRoleIds: roleIds.map((roleId) => Number(roleId)),
                    isDefault,
                }
                console.log('[ChannelSettingsModal] update channel', channelInfo)
                const txResult = await updateChannelTransaction(channelInfo, signer)
                console.log('[ChannelSettingsModal] txResult', txResult)
                if (txResult?.status === TransactionStatus.Success) {
                    invalidateQuery()
                    onUpdatedChannel()
                }
            }
        },
        [
            channelId,
            invalidateQuery,
            onUpdatedChannel,
            spaceId,
            transactionUIState,
            updateChannelTransaction,
            getSigner,
        ],
    )

    const onNameKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!ChannelNameRegExp.test(event.key)) {
            event.preventDefault()
            return
        }

        const val = event.currentTarget.value
        const prevChar = val.charAt(val.length - 1)
        if (
            (event.key === ' ' || event.key === ' Spacebar' || event.key === '-') &&
            prevChar === '-'
        ) {
            event.preventDefault()
        }
    }, [])

    const errorBox = useMemo(() => {
        let errMsg: string | undefined = undefined
        // TODO: refactor error handling to use Web3/utils.mapToErrorMessage
        // https://linear.app/hnt-labs/issue/HNT-4621/refactor-create-channel-and-edit-channel-error-reporting
        switch (true) {
            case transactionError instanceof SignerUndefinedError:
                errMsg = 'Wallet is not connected'
                break
            case transactionError instanceof WalletDoesNotMatchSignedInAccountError:
                errMsg = 'Current wallet is not the same as the signed in account'
                break
            case transactionError && hasServerError:
                if (transactionError && isForbiddenError(transactionError)) {
                    errMsg = "You don't have permission to update a channel in this town"
                } else {
                    errMsg = 'There was an error updating the channel'
                }
                break
            case hasTransactionError:
                errMsg = 'There was an error with the transaction. Please try again'
                break
            default:
                errMsg = undefined
                break
        }
        // mapToErrorMessage(transactionError) handles more cases that might result in not showing the error message to a user - i.e. transasction rejected by user
        if (errMsg && mapToErrorMessage(transactionError)) {
            return (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message={errMsg} />
                </Box>
            )
        }
        return null
    }, [hasServerError, hasTransactionError, transactionError])

    return (
        <Stack gap="lg">
            <Heading level={3}>Edit channel</Heading>
            <FormRender<FormState>
                schema={schema}
                defaultValues={defaultValues}
                mode="onChange"
                onSubmit={onSubmit}
            >
                {({ register, formState, setValue, resetField }) => {
                    const { onChange: onNameChange, ...restOfNameProps } = register(
                        FormStateKeys.name,
                    )
                    return (
                        <Stack>
                            <Stack>
                                <TextField
                                    autoFocus
                                    background="level2"
                                    label="Name"
                                    placeholder="Name your channel"
                                    maxLength={30}
                                    message={
                                        <ErrorMessage
                                            errors={formState.errors}
                                            fieldName={FormStateKeys.name}
                                        />
                                    }
                                    onKeyDown={onNameKeyDown}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                        onNameChange(event)
                                        setValue(
                                            FormStateKeys.name,
                                            event.target.value.toLowerCase().replaceAll(' ', '-'),
                                        )
                                    }}
                                    {...restOfNameProps}
                                />
                            </Stack>

                            <Stack paddingTop="sm">
                                <TextField
                                    background="level2"
                                    label="Description"
                                    placeholder="Describe what this channel is about"
                                    maxLength={255}
                                    message={
                                        <ErrorMessage
                                            errors={formState.errors}
                                            fieldName={FormStateKeys.description}
                                        />
                                    }
                                    {...register(FormStateKeys.description)}
                                />
                            </Stack>

                            <Stack gap="sm" maxHeight="50vh" overflow="auto">
                                {!rolesWithDetails ? (
                                    <Box gap paddingY="lg">
                                        <ButtonSpinner />
                                    </Box>
                                ) : (
                                    <RolesSection
                                        rolesWithDetails={rolesWithDetails}
                                        resetField={resetField}
                                        spaceId={spaceId}
                                        register={register}
                                    />
                                )}

                                <ErrorMessage
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.roleIds}
                                />

                                {errorBox}
                            </Stack>

                            <Stack paddingTop="sm" paddingRight="md">
                                <Box padding="sm" background="level2" borderRadius="sm">
                                    <Checkbox
                                        width="100%"
                                        label="Is Default:"
                                        name={FormStateKeys.isDefault}
                                        register={register}
                                    />
                                </Box>
                            </Stack>

                            <Box flexDirection="row" justifyContent="end" gap="sm" paddingTop="lg">
                                <Stack horizontal gap justifyContent="end">
                                    <Button
                                        tone="level2"
                                        value="Cancel"
                                        disabled={transactionUIState != TransactionUIState.None}
                                        onClick={onHide}
                                    >
                                        Cancel
                                    </Button>

                                    <TransactionButton
                                        transactionState={transactionUIState}
                                        transactingText="Updating channel"
                                        successText="Channel updated"
                                        idleText="Save on chain"
                                    />
                                </Stack>
                            </Box>

                            {preventCloseMessage && (
                                <Box centerContent paddingY="md">
                                    <ErrorMessageText
                                        color="negative"
                                        message={preventCloseMessage}
                                    />
                                </Box>
                            )}
                        </Stack>
                    )
                }}
            </FormRender>
        </Stack>
    )
}

export function ChannelSettingsModal({
    spaceId,
    channelId,
    onHide,
    onUpdatedChannel,
}: ChannelSettingsModalProps): JSX.Element {
    const [transactionMessage, setTransactionMessage] = useState<string | undefined>()
    const hasPendingTx = useIsTransactionPending(BlockchainTransactionType.EditChannel)

    const _onHide = useCallback(() => {
        if (hasPendingTx) {
            setTransactionMessage('Please wait for the transaction to complete.')
            return
        }
        onHide()
    }, [onHide, hasPendingTx])

    return (
        <>
            <ModalContainer
                key={`${spaceId}_${channelId}}`}
                touchTitle="Edit Channel"
                onHide={_onHide}
            >
                <ChannelSettingsForm
                    spaceId={spaceId}
                    preventCloseMessage={transactionMessage}
                    channelId={channelId}
                    onHide={onHide}
                    onUpdatedChannel={onUpdatedChannel}
                />
            </ModalContainer>
            <UserOpTxModal />
        </>
    )
}
