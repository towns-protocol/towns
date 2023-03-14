import { FieldValues, UseFormRegister } from 'react-hook-form'
import React, { useCallback, useMemo } from 'react'
import {
    RoomIdentifier,
    useMultipleRoleDetails,
    useRoom,
    useUpdateChannelTransaction,
} from 'use-zion-client'

import { RoleDetails } from 'use-zion-client/dist/client/web3/ContractTypes'
import { UpdateChannelInfo } from 'use-zion-client/dist/types/zion-types'
import { z } from 'zod'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { TokenCheckboxLabel } from '@components/Tokens/TokenCheckboxLabel'
import { TransactionButton } from '@components/TransactionButton'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { useSpaceRoleIds } from 'hooks/useContractRoles'
import { useTransactionUIStates } from 'hooks/useTransactionStatus'
import {
    Box,
    Button,
    Checkbox,
    ErrorMessage,
    FormRender,
    Heading,
    Stack,
    Text,
    TextField,
} from '@ui'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { useOnTransactionStages } from 'hooks/useOnTransactionStages'
import { ModalContainer } from '../Modals/ModalContainer'

const FormStateKeys = {
    name: 'name',
    description: 'description',
    roleIds: 'roleIds',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.description]: string | undefined
    [FormStateKeys.roleIds]: string[]
}

const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter a channel name'),
    [FormStateKeys.description]: z.string().min(0, 'Please enter a description'),
    [FormStateKeys.roleIds]: z.string().array().nonempty('Please select at least one role'),
})

const emptyDefaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.description]: undefined,
    [FormStateKeys.roleIds]: [],
}

type ChannelSettingsModalProps = {
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    onHide: () => void
    onUpdatedChannel: () => void
}

interface RoleCheckboxProps extends RoleDetails {
    channelHasRole: boolean
    tokenAddresses: string[]
}

function ChannelSettingsPopup({
    spaceId,
    channelId,
    onHide,
    onUpdatedChannel,
}: ChannelSettingsModalProps): JSX.Element {
    const room = useRoom(channelId)
    // get the space roles and other role details
    const spaceRoleIds = useSpaceRoleIds(spaceId.networkId)
    const { data: _rolesDetails } = useMultipleRoleDetails(spaceId.networkId, spaceRoleIds)
    const rolesWithDetails = useMemo(
        (): RoleCheckboxProps[] | undefined =>
            _rolesDetails?.map((role) => {
                const channelHasRole = role.channels.some(
                    (c) => c.channelNetworkId === channelId.networkId,
                )
                return {
                    ...role,
                    channelHasRole,
                    tokenAddresses: role.tokens.map((token) => token.contractAddress as string),
                }
            }),
        [_rolesDetails, channelId.networkId],
    )

    const defaultValues = useMemo((): FormState => {
        if (room) {
            return {
                [FormStateKeys.name]: room.name,
                [FormStateKeys.description]: room.topic,
                [FormStateKeys.roleIds]: spaceRoleIds?.map((roleId) => roleId.toString()) ?? [],
            }
        }
        return emptyDefaultValues
    }, [room, spaceRoleIds])

    const {
        updateChannelTransaction,
        error: transactionError,
        transactionStatus,
        transactionHash,
    } = useUpdateChannelTransaction()

    const transactionUIState = useTransactionUIStates(transactionStatus, Boolean(channelId))

    const onSuccessfulTransaction = useCallback(() => {
        onUpdatedChannel()
    }, [onUpdatedChannel])

    useOnTransactionStages({
        transactionStatus,
        transactionHash,
        onSuccess: onSuccessfulTransaction,
    })

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

    const onSubmit = useCallback(
        async (changes: FormState) => {
            if (transactionUIState.isAbleToInteract) {
                const name = changes[FormStateKeys.name]
                const description = changes[FormStateKeys.description]
                const roleIds = changes[FormStateKeys.roleIds].map((roleId) => Number(roleId))
                const channelInfo: UpdateChannelInfo = {
                    parentSpaceId: spaceId,
                    channelId,
                    updatedChannelName: name,
                    updatedChannelTopic: description,
                    updatedRoleIds: roleIds.map((roleId) => Number(roleId)),
                }
                await updateChannelTransaction(channelInfo)
            }
        },
        [channelId, spaceId, transactionUIState.isAbleToInteract, updateChannelTransaction],
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

    return (
        <Stack gap="lg">
            <Heading level={3}>Edit channel</Heading>
            <FormRender<FormState>
                schema={schema}
                defaultValues={defaultValues}
                mode="onChange"
                onSubmit={onSubmit}
            >
                {({ register, formState, setValue }) => {
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

                            <Stack gap="sm">
                                <Stack>
                                    <Box paddingTop="md" paddingBottom="sm">
                                        <Text strong>Which roles have access to this channel</Text>
                                    </Box>
                                </Stack>

                                {rolesWithDetails?.map((role) => {
                                    return (
                                        <RoleDetailsComponent
                                            key={role.id}
                                            spaceId={spaceId}
                                            role={role}
                                            register={register}
                                        />
                                    )
                                })}

                                <ErrorMessage
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.roleIds}
                                />

                                {hasTransactionError && (
                                    <Box
                                        paddingBottom="sm"
                                        flexDirection="row"
                                        justifyContent="end"
                                    >
                                        <ErrorMessageText message="There was an error with the transaction. Please try again" />
                                    </Box>
                                )}

                                {transactionError && hasServerError && (
                                    <Box
                                        paddingBottom="sm"
                                        flexDirection="row"
                                        justifyContent="end"
                                    >
                                        <ErrorMessageText
                                            message={
                                                isForbiddenError(transactionError)
                                                    ? "You don't have permission to update a channel in this space"
                                                    : 'There was an error updating the channel'
                                            }
                                        />
                                    </Box>
                                )}
                            </Stack>

                            <Box flexDirection="row" justifyContent="end" gap="sm" paddingTop="lg">
                                <Stack horizontal gap justifyContent="end">
                                    <Button tone="level2" value="Cancel" onClick={onHide}>
                                        Cancel
                                    </Button>

                                    <TransactionButton
                                        disabled={isDisabled}
                                        transactionUIState={transactionUIState}
                                        transactingText="Updating channel"
                                    >
                                        Save on chain
                                    </TransactionButton>
                                </Stack>
                            </Box>

                            {!isTransactionNetwork && (
                                <Box paddingTop="md" flexDirection="row" justifyContent="end">
                                    <RequireTransactionNetworkMessage
                                        postCta="to update a channel."
                                        switchNetwork={switchNetwork}
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

function RoleDetailsComponent(props: {
    spaceId: RoomIdentifier
    role: RoleCheckboxProps
    register: UseFormRegister<FieldValues>
}): JSX.Element {
    return (
        <Box padding="md" background="level2" borderRadius="sm" key={props.role.id}>
            <Checkbox
                width="100%"
                name={FormStateKeys.roleIds}
                label={
                    <TokenCheckboxLabel
                        label={props.role.name}
                        spaceId={props.spaceId}
                        tokenAddresses={props.role.tokenAddresses}
                    />
                }
                defaultChecked={props.role.channelHasRole}
                value={props.role.id.toString()}
                register={props.register}
            />
        </Box>
    )
}

export function ChannelSettingsModal({
    spaceId,
    channelId,
    onHide,
    onUpdatedChannel,
}: ChannelSettingsModalProps): JSX.Element {
    return (
        <ModalContainer key={`${spaceId.networkId}_${channelId.networkId}}`} onHide={onHide}>
            <ChannelSettingsPopup
                spaceId={spaceId}
                channelId={channelId}
                onHide={onHide}
                onUpdatedChannel={onUpdatedChannel}
            />
        </ModalContainer>
    )
}
