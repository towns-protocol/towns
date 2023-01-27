import React, { useCallback, useMemo } from 'react'
import { RoomIdentifier, RoomVisibility, useCreateChannelTransaction } from 'use-zion-client'
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { Box, Button, Checkbox, ErrorMessage, FormRender, Stack, Text, TextField } from '@ui'
import { TransactionButton } from '@components/TransactionButton'
import { useTransactionUIStates } from 'hooks/useTransactionStatus'
import { useChannelCreationRoles } from 'hooks/useContractRoles'
import { PATHS } from 'routes'
import { StoredTransactionType } from 'store/transactionsStore'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { useSaveTransactionOnCreation } from 'hooks/useSaveTransactionOnSuccess'
import { useOnSuccessfulTransaction } from 'hooks/useOnSuccessfulTransaction'
import { isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'

type Props = {
    spaceId: RoomIdentifier
    onCreateChannel: (roomId: RoomIdentifier) => void
    onHide: () => void
}

const FormStateKeys = {
    name: 'name',
    roleIds: 'roleIds',
    disableEncryption: 'disableEncryption',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.roleIds]: string[]
    [FormStateKeys.disableEncryption]: boolean
}

const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter a channel name'),
    [FormStateKeys.roleIds]: z.string().array().nonempty('Please select at least one role'),
    [FormStateKeys.disableEncryption]: z.boolean(),
})

const defaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.roleIds]: [],
    [FormStateKeys.disableEncryption]: false,
}

const channelNameRegEx = new RegExp(/^[a-zA-Z0-9 _-]+$/)

export const CreateChannelForm = (props: Props) => {
    const { onCreateChannel, onHide } = props
    const { data: roles } = useChannelCreationRoles(props.spaceId.networkId)
    const {
        createChannelTransaction,
        error: transactionError,
        transactionStatus,
        transactionHash,
        data: channelId,
    } = useCreateChannelTransaction()
    const transactionUIState = useTransactionUIStates(transactionStatus, Boolean(channelId))
    const { isAbleToInteract } = transactionUIState
    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()
    const isDisabled = !isTransactionNetwork

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

    const onKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!channelNameRegEx.test(event.key)) {
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

    useSaveTransactionOnCreation({
        hash: transactionHash,
        data: channelId?.slug,
        type: StoredTransactionType.CreateChannel,
        status: transactionStatus,
    })

    const onSuccessfulTransaction = useCallback(() => {
        channelId && onCreateChannel(channelId)
    }, [channelId, onCreateChannel])

    useOnSuccessfulTransaction({
        status: transactionStatus,
        callback: onSuccessfulTransaction,
    })

    return (
        <FormRender<FormState>
            schema={schema}
            defaultValues={defaultValues}
            mode="onChange"
            onSubmit={async ({ name, roleIds, disableEncryption }) => {
                const channelInfo = {
                    name: name,
                    visibility: RoomVisibility.Public,
                    parentSpaceId: props.spaceId,
                    roleIds: roleIds.map((roleId) => Number(roleId)),
                    disableEncryption: disableEncryption,
                }
                await createChannelTransaction(channelInfo)
            }}
        >
            {({ register, formState, setValue, getValues }) => {
                const { onChange: onNameChange, ...restOfNameProps } = register(FormStateKeys.name)
                return (
                    <>
                        <Stack>
                            <TextField
                                autoFocus
                                background="level2"
                                label="Name"
                                placeholder="channel-name"
                                maxLength={30}
                                message={
                                    <ErrorMessage
                                        errors={formState.errors}
                                        fieldName={FormStateKeys.name}
                                    />
                                }
                                onKeyDown={onKeyDown}
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
                        <Stack gap="sm">
                            <Box paddingTop="md" paddingBottom="sm">
                                <Text strong>Which roles have access to this channel</Text>
                            </Box>

                            {roles?.map((role) => {
                                const id = role.roleId?.toNumber().toString()
                                if (!id) {
                                    return null
                                }
                                return (
                                    <Box
                                        padding="md"
                                        background="level2"
                                        borderRadius="sm"
                                        key={id}
                                    >
                                        <Checkbox
                                            width="100%"
                                            name={FormStateKeys.roleIds}
                                            label={role.name}
                                            value={id}
                                            register={register}
                                        />
                                    </Box>
                                )
                            })}

                            <ErrorMessage
                                errors={formState.errors}
                                fieldName={FormStateKeys.roleIds}
                            />

                            <Box padding="md" background="level2" borderRadius="sm">
                                <Checkbox
                                    name={FormStateKeys.disableEncryption}
                                    width="100%"
                                    label="Disable Encryption"
                                    onChange={() =>
                                        setValue(
                                            FormStateKeys.disableEncryption,
                                            !getValues().disableEncryption,
                                        )
                                    }
                                />
                            </Box>

                            {hasTransactionError && (
                                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                                    <ErrorMessageText message="There was an error with the transaction. Please try again" />
                                </Box>
                            )}

                            {transactionError && hasServerError && (
                                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                                    <ErrorMessageText
                                        message={
                                            isForbiddenError(transactionError)
                                                ? "You don't have permission to create a channel in this space"
                                                : 'There was an error creating the channel'
                                        }
                                    />
                                </Box>
                            )}
                        </Stack>

                        <Box flexDirection="row" justifyContent="end" gap="sm" paddingTop="lg">
                            <Button type="button" disabled={!isAbleToInteract} onClick={onHide}>
                                Cancel
                            </Button>

                            <TransactionButton
                                disabled={isDisabled}
                                transactionUIState={transactionUIState}
                                transactingText="Creating channel"
                            >
                                Create
                            </TransactionButton>
                        </Box>

                        {isDisabled && (
                            <Box paddingTop="md" flexDirection="row" justifyContent="end">
                                <RequireTransactionNetworkMessage
                                    postCta="to create a channel."
                                    switchNetwork={switchNetwork}
                                />
                            </Box>
                        )}
                    </>
                )
            }}
        </FormRender>
    )
}

export const CreateChannelFormContainer = ({ spaceId, onHide }: Omit<Props, 'onCreateChannel'>) => {
    const navigate = useNavigate()

    const onCreateChannel = useCallback(
        (roomId: RoomIdentifier) => {
            navigate(`/${PATHS.SPACES}/${spaceId?.slug}/${PATHS.CHANNELS}/${roomId.slug}/`)
            onHide()
        },
        [navigate, spaceId, onHide],
    )

    return <CreateChannelForm spaceId={spaceId} onHide={onHide} onCreateChannel={onCreateChannel} />
}
