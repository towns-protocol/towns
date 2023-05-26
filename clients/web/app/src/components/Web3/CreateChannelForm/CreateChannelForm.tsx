import {
    Permission,
    RoomIdentifier,
    RoomVisibility,
    SignerUndefinedError,
    WalletDoesNotMatchSignedInAccountError,
    useCreateChannelTransaction,
    useCurrentWalletEqualsSignedInAccount,
    useMultipleRoleDetails,
    useSyncSpace,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Box, Button, Checkbox, ErrorMessage, FormRender, Icon, Stack, Text, TextField } from '@ui'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'

import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { PATHS } from 'routes'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { Spinner } from '@components/Spinner'
import { TokenCheckboxLabel } from '@components/Tokens/TokenCheckboxLabel'
import { TransactionButton } from '@components/TransactionButton'
import { env } from 'utils'
import { useOnTransactionStages } from 'hooks/useOnTransactionStages'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { useSpaceRoles } from 'hooks/useContractRoles'
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
    const rolesWithDetails = useMemo(() => {
        const r = _rolesDetails
            ?.filter((role) => role.permissions.includes(Permission.Read))
            .map((role) => {
                return {
                    ...role,
                    tokenAddresses: role.tokens.map((token) => token.contractAddress as string),
                }
            })
        return r
    }, [_rolesDetails])

    const {
        createChannelTransaction,
        error: transactionError,
        transactionStatus,
        transactionHash,
        data: channelId,
    } = useCreateChannelTransaction()

    useEffect(() => {
        console.log(
            '[CreateChannelForm]',
            'createChannelTransaction',
            'transactionStatus:',
            transactionStatus,
            'transactionHash:',
            transactionHash,
        )
    }, [transactionHash, transactionStatus])

    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(channelId))
    const isAbleToInteract = transactionUIState === TransactionUIState.None
    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()
    const currentWalletEqualsSignedInAccount = useCurrentWalletEqualsSignedInAccount()
    const isDisabled = !isTransactionNetwork || !currentWalletEqualsSignedInAccount

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

    const errorBox = useMemo(() => {
        let errMsg: string | undefined = undefined
        switch (true) {
            case transactionError instanceof SignerUndefinedError:
                errMsg = 'Wallet is not connected'
                break
            case transactionError instanceof WalletDoesNotMatchSignedInAccountError:
                errMsg = 'Current wallet is not the same as the signed in account.'
                break
            case transactionError && hasServerError:
                if (transactionError && isForbiddenError(transactionError)) {
                    errMsg = "You don't have permission to create a channel in this town"
                } else {
                    errMsg = 'There was an error creating the channel'
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

    const { syncSpace } = useSyncSpace()
    const onSuccessfulTransaction = useCallback(() => {
        console.log('[CreateChannelForm]', 'onSuccessfulTransaction')
        invalidateQuery()
        syncSpace(props.spaceId) // re-sync the space hierarchy once the transaction is completed
        if (!channelId) {
            return
        }
        setTimeout(() => {
            onCreateChannel(channelId)
        }, 1500)
    }, [invalidateQuery, channelId, syncSpace, props.spaceId, onCreateChannel])

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

                            {errorBox}
                        </Stack>

                        <Box flexDirection="row" justifyContent="end" gap="sm" paddingTop="lg">
                            <Button type="button" disabled={!isAbleToInteract} onClick={onHide}>
                                Cancel
                            </Button>

                            <TransactionButton
                                disabled={isDisabled}
                                transactionState={transactionUIState}
                                transactingText="Creating channel"
                                successText="Channel created"
                                idleText="Create"
                            />
                        </Box>

                        {!isTransactionNetwork && (
                            <Box paddingTop="md" flexDirection="row" justifyContent="end">
                                <RequireTransactionNetworkMessage
                                    postCta="to create a channel."
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
