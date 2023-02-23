import React, { useCallback, useMemo } from 'react'
import {
    RoomIdentifier,
    RoomVisibility,
    useCreateChannelTransaction,
    useMultipleRoleDetails,
} from 'use-zion-client'
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { ContractMetadata } from '@token-worker/types'
import { Box, Button, Checkbox, ErrorMessage, FormRender, Stack, Text, TextField } from '@ui'
import { TransactionButton } from '@components/TransactionButton'
import { useTransactionUIStates } from 'hooks/useTransactionStatus'
import { useChannelCreationRoles } from 'hooks/useContractRoles'
import { PATHS } from 'routes'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { useOnTransactionStages } from 'hooks/useOnTransactionStages'
import { isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { Spinner } from '@components/Spinner'
import { useRoleTokensMetatdata } from 'api/lib/collectionMetadata'
import { TokenAvatar } from '@components/Tokens'

type Props = {
    spaceId: RoomIdentifier
    onCreateChannel: (roomId: RoomIdentifier) => void
    onHide: () => void
}

const FormStateKeys = {
    name: 'name',
    roleIds: 'roleIds',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.roleIds]: string[]
}

const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter a channel name'),
    [FormStateKeys.roleIds]: z.string().array().nonempty('Please select at least one role'),
})

const defaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.roleIds]: [],
}

const channelNameRegEx = new RegExp(/^[a-zA-Z0-9 _-]+$/)

const TokenCheckboxLabel = (props: {
    spaceId: RoomIdentifier
    tokenAddresses: string[]
    label: string
}) => {
    const { data } = useRoleTokensMetatdata(props.spaceId, props.tokenAddresses)

    return (
        <Box>
            <Box>{props.label}</Box>

            {!data ? (
                <Box visibility="hidden">
                    <TokenAvatar size="avatar_md" />
                </Box>
            ) : !data.length ? null : (
                <Box horizontal gap="lg" paddingTop="md">
                    {data
                        .filter((token): token is ContractMetadata => !!token)
                        .map((token) => {
                            return (
                                <TokenAvatar
                                    data-testid="create-channel-token-avatar"
                                    key={token.address}
                                    imgSrc={token.imageUrl}
                                    size="avatar_md"
                                    label={token.name}
                                />
                            )
                        })}
                </Box>
            )}
        </Box>
    )
}

export const CreateChannelForm = (props: Props) => {
    const { onCreateChannel, onHide } = props
    const { data: roles } = useChannelCreationRoles(props.spaceId.networkId)
    const roledIds = useMemo(() => roles?.map((r) => r.roleId?.toNumber()) ?? [], [roles])
    const { data: _rolesDetails } = useMultipleRoleDetails(props.spaceId.networkId, roledIds)
    const rolesWithDetails = useMemo(
        () =>
            _rolesDetails?.map((role) => {
                return {
                    ...role,
                    tokenAddresses: role.tokens.map((token) => token.contractAddress as string),
                }
            }),
        [_rolesDetails],
    )

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

    const onSuccessfulTransaction = useCallback(() => {
        channelId && onCreateChannel(channelId)
    }, [channelId, onCreateChannel])

    useOnTransactionStages({
        transactionStatus,
        transactionHash,
        onSuccess: onSuccessfulTransaction,
    })

    return (
        <FormRender<FormState>
            schema={schema}
            defaultValues={defaultValues}
            mode="onChange"
            onSubmit={async ({ name, roleIds }) => {
                const channelInfo = {
                    name: name,
                    visibility: RoomVisibility.Public,
                    parentSpaceId: props.spaceId,
                    roleIds: roleIds.map((roleId) => Number(roleId)),
                }
                await createChannelTransaction(channelInfo)
            }}
        >
            {({ register, formState, setValue, getValues }) => {
                const { onChange: onNameChange, ...restOfNameProps } = register(FormStateKeys.name)
                return !rolesWithDetails ? (
                    <Stack centerContent height="250">
                        <Spinner />
                    </Stack>
                ) : (
                    <Stack>
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

                            {rolesWithDetails?.map((role) => {
                                return (
                                    <Box
                                        padding="md"
                                        background="level2"
                                        borderRadius="sm"
                                        key={role.id}
                                    >
                                        <Checkbox
                                            width="100%"
                                            name={FormStateKeys.roleIds}
                                            label={
                                                <TokenCheckboxLabel
                                                    label={role.name}
                                                    spaceId={props.spaceId}
                                                    tokenAddresses={role.tokenAddresses}
                                                />
                                            }
                                            value={role.id.toString()}
                                            register={register}
                                        />
                                    </Box>
                                )
                            })}

                            <ErrorMessage
                                errors={formState.errors}
                                fieldName={FormStateKeys.roleIds}
                            />

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
                    </Stack>
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
