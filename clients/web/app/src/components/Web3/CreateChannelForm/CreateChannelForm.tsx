import React, { useCallback, useMemo } from 'react'
import {
    Permission,
    RoomIdentifier,
    RoomVisibility,
    useCreateChannelTransaction,
    useMultipleRoleDetails,
} from 'use-zion-client'
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'
import { Box, Button, Checkbox, ErrorMessage, FormRender, Icon, Stack, Text, TextField } from '@ui'
import { TransactionButton } from '@components/TransactionButton'
import { useTransactionUIStates } from 'hooks/useTransactionStatus'
import { useSpaceRoles } from 'hooks/useContractRoles'
import { PATHS } from 'routes'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { useOnTransactionStages } from 'hooks/useOnTransactionStages'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { Spinner } from '@components/Spinner'
import { TokenCheckboxLabel } from '@components/Tokens/TokenCheckboxLabel'
import { env } from 'utils'

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
    [FormStateKeys.name]: z.string().min(2, 'Channel names must have at least 2 characters'),
    [FormStateKeys.roleIds]: z.string().array().nonempty('Please select at least one role'),
})

export const CreateChannelForm = (props: Props) => {
    const { onCreateChannel, onHide } = props
    const { data: roles } = useSpaceRoles(props.spaceId.networkId)
    const roledIds = useMemo(() => roles?.map((r) => r.roleId?.toNumber()) ?? [], [roles])
    const { data: _rolesDetails, invalidateQuery } = useMultipleRoleDetails(
        props.spaceId.networkId,
        roledIds,
    )
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

    const onSuccessfulTransaction = useCallback(() => {
        invalidateQuery()
        channelId && onCreateChannel(channelId)
    }, [channelId, onCreateChannel, invalidateQuery])

    const firstRoleIDWithReadPermission = rolesWithDetails
        ?.find((role) => role.permissions.includes(Permission.Read))
        ?.id.toString()

    const defaultValues = {
        [FormStateKeys.name]: '',
        [FormStateKeys.roleIds]: firstRoleIDWithReadPermission
            ? [firstRoleIDWithReadPermission]
            : [],
    }

    useOnTransactionStages({
        transactionStatus,
        transactionHash,
        onSuccess: onSuccessfulTransaction,
    })

    return rolesWithDetails ? (
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

                            <Box flexDirection="row" justifyContent="start" paddingTop="sm">
                                <Link
                                    to={`/${PATHS.SPACES}/${props.spaceId.slug}/${PATHS.SETTINGS}`}
                                >
                                    <Button onClick={onHide}>
                                        <Icon type="plus" size="square_sm" />
                                        Create a new role
                                    </Button>
                                </Link>
                            </Box>

                            {env.IS_DEV ? (
                                <Box color="negative" maxWidth="400">
                                    <Text size="sm">
                                        DEV message: If you are not seeing token display data here,
                                        make sure you are on the correct network and pointed to
                                        correct homeserver. See useNetworkForNftApi()
                                    </Text>
                                </Box>
                            ) : null}

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
                                                ? "You don't have permission to create a channel in this town"
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
    ) : (
        <></>
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
