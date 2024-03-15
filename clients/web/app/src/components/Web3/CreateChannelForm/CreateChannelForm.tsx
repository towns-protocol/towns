import {
    Permission,
    SignerUndefinedError,
    TransactionStatus,
    WalletDoesNotMatchSignedInAccountError,
    useCreateChannelTransaction,
    useMultipleRoleDetails,
} from 'use-towns-client'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Toast, toast } from 'react-hot-toast/headless'
import {
    Box,
    Button,
    Checkbox,
    ErrorMessage,
    FancyButton,
    FormRender,
    Icon,
    IconButton,
    Stack,
    Text,
    TextField,
} from '@ui'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { Spinner } from '@components/Spinner'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { TokenCheckboxLabel } from '@components/Tokens/TokenCheckboxLabel'
import { env } from 'utils'
import { useContractRoles } from 'hooks/useContractRoles'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { mapToErrorMessage } from '../utils'

type Props = {
    spaceId: string
    onCreateChannel: (roomId: string) => void
    onHide: () => void
}

const FormStateKeys = {
    name: 'name',
    topic: 'topic',
    roleIds: 'roleIds',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.topic]: string
    [FormStateKeys.roleIds]: string[]
}

const schema = z.object({
    [FormStateKeys.name]: z.string().min(2, 'Channel names must have at least 2 characters'),
    [FormStateKeys.topic]: z.string(),
    [FormStateKeys.roleIds]: z.string().array().nonempty('Please select at least one role'),
})

export const CreateChannelForm = (props: Props) => {
    const { onCreateChannel, onHide } = props
    const { data: roles } = useContractRoles(props.spaceId)
    const roledIds = useMemo(() => roles?.map((r) => r.roleId) ?? [], [roles])
    const { data: _rolesDetails, invalidateQuery } = useMultipleRoleDetails(props.spaceId, roledIds)
    const rolesWithDetails = useMemo(() => {
        return _rolesDetails?.filter((role) => role.permissions.includes(Permission.Read))
    }, [_rolesDetails])
    const channels = useSpaceChannels()
    const channelNames = useMemo(() => new Set(channels?.map((c) => c.label) ?? []), [channels])

    const { isTouch } = useDevice()

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
        // TODO: refactor error handling to use Web3/utils.mapToErrorMessage
        // https://linear.app/hnt-labs/issue/HNT-4621/refactor-create-channel-and-edit-channel-error-reporting
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

    const firstRoleIDWithReadPermission = rolesWithDetails
        ?.find((role) => role.permissions.includes(Permission.Read))
        ?.id.toString()

    const channelNameAvailable = useCallback(
        (name: string) => {
            return !channelNames.has(name)
        },
        [channelNames],
    )

    const defaultValues = {
        [FormStateKeys.name]: '',
        [FormStateKeys.roleIds]: firstRoleIDWithReadPermission
            ? [firstRoleIDWithReadPermission]
            : [],
    }
    const getSigner = useGetEmbeddedSigner()

    return rolesWithDetails ? (
        <FormRender<FormState>
            schema={schema}
            defaultValues={defaultValues}
            mode="onChange"
            onSubmit={async ({ name, topic, roleIds }) => {
                const signer = await getSigner()
                const channelInfo = {
                    name: name,
                    topic: topic,
                    parentSpaceId: props.spaceId,
                    roleIds: roleIds.map((roleId) => Number(roleId)),
                }
                if (!signer) {
                    createPrivyNotAuthenticatedNotification()
                    return
                }
                const txResult = await createChannelTransaction(channelInfo, signer)
                console.log('[CreateChannelForm]', 'createChannelTransaction result', txResult)
                if (txResult?.status === TransactionStatus.Success) {
                    invalidateQuery()
                    const channelId = txResult.data
                    if (channelId) {
                        toast.custom((t) => {
                            return (
                                <ChannelCreatedToast
                                    toast={t}
                                    message={`#${name} was created and saved on chain.`}
                                />
                            )
                        })
                        onCreateChannel(channelId)
                    }
                }
            }}
        >
            {({ register, formState, setValue, getValues, setError }) => {
                const { onChange: onNameChange, ...restOfNameProps } = register(FormStateKeys.name)
                const { onChange: onTopicChange, ...restOfTopicProps } = register(
                    FormStateKeys.topic,
                )
                return !rolesWithDetails ? (
                    <Stack centerContent height="250">
                        <Spinner />
                    </Stack>
                ) : (
                    <Stack>
                        <Stack gap>
                            <TextField
                                autoFocus
                                background="level2"
                                label="Name"
                                placeholder="channel-name"
                                maxLength={30}
                                message={
                                    <ErrorMessage
                                        preventSpace
                                        errors={formState.errors}
                                        fieldName={FormStateKeys.name}
                                    />
                                }
                                onKeyDown={onKeyDown}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    const name = event.target.value
                                        .toLowerCase()
                                        .replaceAll(' ', '-')
                                    if (!channelNameAvailable(name)) {
                                        setError(FormStateKeys.name, {
                                            message: 'This channel name is already taken',
                                        })
                                        return
                                    }
                                    onNameChange(event)
                                    setValue(FormStateKeys.name, name)
                                }}
                                {...restOfNameProps}
                            />

                            <TextField
                                background="level2"
                                label="Description"
                                placeholder="Edit channel description"
                                maxLength={30}
                                message={
                                    <ErrorMessage
                                        errors={formState.errors}
                                        fieldName={FormStateKeys.topic}
                                    />
                                }
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    onTopicChange(event)
                                    setValue(FormStateKeys.topic, event.target.value.slice(0, 30))
                                }}
                                {...restOfTopicProps}
                            />
                        </Stack>
                        <Stack gap="sm" maxHeight="50vh" overflow="auto">
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
                                                // parse tokens from TODO ruleData
                                                <TokenCheckboxLabel label={role.name} tokens={[]} />
                                            }
                                            value={role.id.toString()}
                                            register={register}
                                        />
                                    </Box>
                                )
                            })}

                            <Box flexDirection="row" justifyContent="start" paddingTop="sm">
                                <Link to={`/${PATHS.SPACES}/${props.spaceId}/${PATHS.SETTINGS}`}>
                                    <Button onClick={onHide}>
                                        <Icon type="plus" size="square_sm" />
                                        Create a new role
                                    </Button>
                                </Link>
                            </Box>

                            {env.DEV ? (
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

                        {isTouch ? (
                            <Box flexDirection="row" justifyContent="end" gap="sm" paddingTop="lg">
                                <Button type="button" disabled={!isAbleToInteract} onClick={onHide}>
                                    Cancel
                                </Button>

                                <FancyButton
                                    cta={isAbleToInteract}
                                    type="submit"
                                    disabled={!isAbleToInteract}
                                    spinner={!isAbleToInteract}
                                >
                                    {!isAbleToInteract ? 'Creating' : 'Create Channel'}
                                </FancyButton>
                            </Box>
                        ) : (
                            <Box padding position="absolute" bottom="none" left="none" right="none">
                                <FancyButton
                                    cta={isAbleToInteract && formState.isValid}
                                    type="submit"
                                    disabled={!isAbleToInteract}
                                    spinner={!isAbleToInteract}
                                >
                                    {isAbleToInteract ? 'Create Channel' : 'Creating'}
                                </FancyButton>
                            </Box>
                        )}
                    </Stack>
                )
            }}
        </FormRender>
    ) : (
        <ButtonSpinner />
    )
}

export const CreateChannelFormContainer = ({
    spaceId,
    onHide,
    hideOnCreation,
}: Omit<Props, 'onCreateChannel'> & { hideOnCreation?: boolean }) => {
    const navigate = useNavigate()

    const onCreateChannel = useCallback(
        (roomId: string) => {
            console.log('[CreateChannelForm]', 'onCreateChannel', roomId)
            navigate(
                `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${roomId}/${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.CHANNEL}`,
            )
            if (hideOnCreation) {
                onHide()
            }
        },
        [navigate, spaceId, onHide, hideOnCreation],
    )

    return (
        <>
            <CreateChannelForm
                spaceId={spaceId}
                onHide={onHide}
                onCreateChannel={onCreateChannel}
            />
            <UserOpTxModal />
        </>
    )
}

export const CreateChannelFormModal = ({ spaceId, onHide }: Omit<Props, 'onCreateChannel'>) => {
    return (
        <>
            <ModalContainer onHide={onHide}>
                <CreateChannelFormContainer hideOnCreation spaceId={spaceId} onHide={onHide} />
            </ModalContainer>
        </>
    )
}

const ChannelCreatedToast = ({ toast: _toast, message }: { toast: Toast; message: string }) => {
    return (
        <Stack horizontal gap alignContent="center">
            <Box centerContent height="x4" width="x4" background="level3" rounded="sm">
                <Icon color="gray2" type="tag" size="square_sm" />
            </Box>
            <Box width="200">
                <Text size="sm">{message}</Text>
            </Box>
            <IconButton icon="close" insetTop="xs" onClick={() => toast.dismiss(_toast.id)}>
                Dismiss
            </IconButton>
        </Stack>
    )
}
