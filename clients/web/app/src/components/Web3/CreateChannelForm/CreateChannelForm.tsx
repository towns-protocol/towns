import React, { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    Permission,
    SignerUndefinedError,
    TransactionStatus,
    WalletDoesNotMatchSignedInAccountError,
    useConnectivity,
    useCreateChannelTransaction,
    useHasPermission,
    useMultipleRoleDetails,
} from 'use-towns-client'
import {
    Box,
    Button,
    Checkbox,
    ErrorMessage,
    FormRender,
    Icon,
    Paragraph,
    Stack,
    Text,
    TextField,
    Toggle,
} from '@ui'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import {
    ChannelNameRegExp,
    addressFromSpaceId,
    isForbiddenError,
    isRejectionError,
} from 'ui/utils/utils'
import { Spinner } from '@components/Spinner'

import { useChangePermissionOverridesStore } from '@components/ChannelSettings/useChangePermissionOverridesStore'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { PanelButton } from '@components/Panel/PanelButton'
import { isChannelPermission } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { useContractRoles } from 'hooks/useContractRoles'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { PersistForm, usePeristedFormValue } from 'ui/components/Form/PersistForm'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { WalletReady } from 'privy/WalletReady'
import { mapToErrorMessage } from '../utils'
import { CreateChannelFormSchema } from './createChannelFormSchema'
import { CreateChannelSubmit } from './CreateChannelSubmit'

type Props = {
    spaceId: string
    onCreateChannel: (roomId: string) => void
    onHide: () => void
}

export const CreateChannelForm = (props: Props) => {
    const { onCreateChannel, onHide, spaceId } = props
    const { data: roles } = useContractRoles(props.spaceId)
    const roledIds = useMemo(() => roles?.map((r) => r.roleId) ?? [], [roles])
    const { data: _rolesDetails, invalidateQuery } = useMultipleRoleDetails(props.spaceId, roledIds)

    const [searchParams] = useSearchParams()
    const channelFormId = searchParams.get('channelFormId')

    const rolesWithDetails = useMemo(() => {
        return _rolesDetails?.filter((role) => role.permissions.includes(Permission.Read))
    }, [_rolesDetails])
    const channels = useSpaceChannels()
    const channelNames = useMemo(() => new Set(channels?.map((c) => c.label) ?? []), [channels])
    const { loggedInWalletAddress } = useConnectivity()

    const { isTouch } = useDevice()

    const {
        createChannelTransaction,
        error: transactionError,
        transactionStatus,
        transactionHash,
        data: channelId,
    } = useCreateChannelTransaction()

    const { openPanel } = usePanelActions()

    const onCreateNewRole = useCallback(() => {
        openPanel('roles', { roles: 'new', stackId: 'main' })
    }, [openPanel])

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
        if (errMsg && mapToErrorMessage({ error: transactionError, source: 'create channel' })) {
            return (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message={errMsg} />
                </Box>
            )
        }
        return null
    }, [hasServerError, hasTransactionError, transactionError])

    const { hasPermission: canEditRoles } = useHasPermission({
        spaceId: spaceId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })

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

    const channelFormPermissionOverrides = useChangePermissionOverridesStore((state) =>
        !channelFormId ? undefined : state.channels[channelFormId]?.roles,
    )

    const onChangePermissions = useCallback(
        (roleId: number) => {
            openPanel(CHANNEL_INFO_PARAMS.EDIT_CHANNEL_PERMISSION_OVERRIDES, {
                roleId: roleId.toString(),
                channelFormId: channelFormId ?? undefined,
            })
        },
        [openPanel, channelFormId],
    )

    const formData = usePeristedFormValue(channelFormId)

    return rolesWithDetails ? (
        <FormRender<CreateChannelFormSchema>
            schema={CreateChannelFormSchema}
            defaultValues={
                formData ?? {
                    name: '',
                    roleIds: firstRoleIDWithReadPermission ? [firstRoleIDWithReadPermission] : [],
                }
            }
            mode="onChange"
        >
            {(hookForm) => {
                const _form = hookForm

                const { register, formState, setValue, setError, watch } = _form

                const { onChange: onNameChange, ...restOfNameProps } = register('name')
                const { onChange: onTopicChange, ...restOfTopicProps } = register('topic')
                const autojoinValue = watch('autojoin')
                const hideUserJoinLeaveEventsValue = watch('hideUserJoinLeaveEvents')

                return !rolesWithDetails ? (
                    <Stack centerContent height="250">
                        <Spinner />
                    </Stack>
                ) : (
                    <Stack>
                        {!!channelFormId && <PersistForm formId={channelFormId} />}
                        <Stack gap>
                            <TextField
                                autoFocus
                                background="level2"
                                label="Name"
                                data-testid="channel-name-input-field"
                                renderLabel={(label) => (
                                    <Text as="label" for="name">
                                        {label}
                                    </Text>
                                )}
                                placeholder="channel-name"
                                maxLength={30}
                                message={
                                    <ErrorMessage<CreateChannelFormSchema>
                                        preventSpace
                                        errors={formState.errors}
                                        fieldName="name"
                                    />
                                }
                                onKeyDown={onKeyDown}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    const name = event.target.value
                                        .toLowerCase()
                                        .replaceAll(' ', '-')
                                    if (!channelNameAvailable(name)) {
                                        setError('name', {
                                            message: 'This channel name is already taken',
                                        })
                                        return
                                    }
                                    onNameChange(event)
                                    setValue('name', name)
                                }}
                                {...restOfNameProps}
                            />

                            <TextField
                                background="level2"
                                label="Description"
                                data-testid="channel-description-input-field"
                                renderLabel={(label) => (
                                    <Text as="label" for="topic">
                                        {label}
                                    </Text>
                                )}
                                placeholder="Edit channel description"
                                maxLength={30}
                                message={
                                    <ErrorMessage errors={formState.errors} fieldName="topic" />
                                }
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    onTopicChange(event)
                                    setValue('topic', event.target.value.slice(0, 30))
                                }}
                                {...restOfTopicProps}
                            />
                        </Stack>
                        <Stack gap="sm">
                            <Box paddingTop="md" paddingBottom="sm">
                                <Text>Who can join?</Text>
                            </Box>

                            {rolesWithDetails.length > 0 && (
                                <Stack scrollbars maxHeight="50vh" gap="sm" insetRight="xs">
                                    {rolesWithDetails.map((role) => {
                                        const permissionOverrides =
                                            channelFormPermissionOverrides?.[role.id]?.permissions
                                        return (
                                            <Stack
                                                padding
                                                paddingTop="xs"
                                                background="level2"
                                                borderRadius="sm"
                                                key={role.id}
                                                gap="none"
                                            >
                                                <Box paddingY="sm">
                                                    <Checkbox
                                                        width="100%"
                                                        name="roleIds"
                                                        label={
                                                            <Text>
                                                                {role.name}{' '}
                                                                {permissionOverrides ? (
                                                                    <span
                                                                        className={atoms({
                                                                            color: 'cta2',
                                                                        })}
                                                                    >
                                                                        *
                                                                    </span>
                                                                ) : (
                                                                    ''
                                                                )}
                                                            </Text>
                                                        }
                                                        value={role.id.toString()}
                                                        register={register}
                                                    />
                                                </Box>
                                                <Stack
                                                    gap="sm"
                                                    cursor="pointer"
                                                    onClick={() => onChangePermissions(role.id)}
                                                >
                                                    {!permissionOverrides ? (
                                                        <Paragraph color="gray2" size="sm">
                                                            {role.permissions
                                                                .filter(isChannelPermission)
                                                                .join(', ')}{' '}
                                                        </Paragraph>
                                                    ) : (
                                                        <Paragraph color="gray2" size="sm">
                                                            {permissionOverrides
                                                                .filter(isChannelPermission)
                                                                .join(', ')}
                                                        </Paragraph>
                                                    )}

                                                    <Paragraph color="cta2" size="sm">
                                                        Change Permissions
                                                    </Paragraph>
                                                </Stack>
                                            </Stack>
                                        )
                                    })}
                                </Stack>
                            )}
                            {canEditRoles && (
                                <PanelButton type="button" onClick={onCreateNewRole}>
                                    <Icon type="plus" size="square_sm" />
                                    Create new role
                                </PanelButton>
                            )}
                            <ErrorMessage errors={formState.errors} fieldName="roleIds" />
                            {errorBox}
                        </Stack>

                        <Stack gap="sm">
                            <Box paddingTop="md" paddingBottom="sm">
                                <Text>Channel Settings</Text>
                            </Box>
                            <Box gap padding rounded="sm" background="level2">
                                <ToggleAutojoin
                                    value={autojoinValue}
                                    onToggle={() => {
                                        setValue('autojoin', !autojoinValue)
                                    }}
                                />

                                <ToggleHideUserJoinLeaveEvents
                                    value={hideUserJoinLeaveEventsValue}
                                    onToggle={() => {
                                        setValue(
                                            'hideUserJoinLeaveEvents',
                                            !hideUserJoinLeaveEventsValue,
                                        )
                                    }}
                                />
                            </Box>
                        </Stack>

                        {/* placeholder for absolute positioned button */}
                        <Stack height="x8" />

                        {isTouch ? (
                            <Stack horizontal justifyContent="end" gap="sm" paddingTop="lg">
                                <Button type="button" disabled={!isAbleToInteract} onClick={onHide}>
                                    Cancel
                                </Button>

                                <WalletReady>
                                    {({ getSigner }) => (
                                        <CreateChannelSubmit
                                            spaceId={spaceId}
                                            channelFormPermissionOverrides={
                                                channelFormPermissionOverrides
                                            }
                                            rolesWithDetails={rolesWithDetails}
                                            createChannelTransaction={createChannelTransaction}
                                            invalidateQuery={invalidateQuery}
                                            getSigner={getSigner}
                                            disabled={!isAbleToInteract}
                                            text={
                                                transactionStatus === TransactionStatus.None
                                                    ? 'Create Channel'
                                                    : 'Creating Channel'
                                            }
                                            onCreateChannel={onCreateChannel}
                                        />
                                    )}
                                </WalletReady>
                            </Stack>
                        ) : (
                            <Stack
                                padding
                                position="absolute"
                                bottom="none"
                                left="none"
                                right="none"
                            >
                                <WalletReady>
                                    {({ getSigner }) => (
                                        <CreateChannelSubmit
                                            spaceId={spaceId}
                                            channelFormPermissionOverrides={
                                                channelFormPermissionOverrides
                                            }
                                            rolesWithDetails={rolesWithDetails}
                                            createChannelTransaction={createChannelTransaction}
                                            invalidateQuery={invalidateQuery}
                                            getSigner={getSigner}
                                            disabled={!isAbleToInteract}
                                            text={
                                                transactionStatus === TransactionStatus.None
                                                    ? 'Create Channel'
                                                    : 'Creating Channel'
                                            }
                                            onCreateChannel={onCreateChannel}
                                        />
                                    )}
                                </WalletReady>
                            </Stack>
                        )}
                    </Stack>
                )
            }}
        </FormRender>
    ) : (
        <ButtonSpinner />
    )
}

type SharedToggleProps = {
    value: boolean
    onToggle: () => void
    disabled?: boolean
}

function ToggleChannelSetting(
    props: {
        heading: string
        subheading: string
    } & SharedToggleProps,
) {
    const { heading, subheading, value, onToggle, disabled } = props
    return (
        <>
            <Stack horizontal grow gap as="label">
                <Stack grow gap="sm">
                    <Text>{heading}</Text>
                    <Text size="sm" color="gray2">
                        {subheading}
                    </Text>
                </Stack>
                <Stack centerContent horizontal gap>
                    <Box>{disabled && <ButtonSpinner height="x1" />}</Box>
                    <Toggle toggled={value} disabled={disabled} onToggle={onToggle} />
                </Stack>
            </Stack>
        </>
    )
}

export function ToggleAutojoin(props: SharedToggleProps) {
    const { value, onToggle, disabled } = props
    return (
        <ToggleChannelSetting
            heading="Auto-join New Members"
            subheading="New members should auto-join this channel."
            disabled={disabled}
            value={value}
            onToggle={onToggle}
        />
    )
}

export function ToggleHideUserJoinLeaveEvents(props: SharedToggleProps) {
    const { value, onToggle, disabled } = props
    return (
        <ToggleChannelSetting
            heading="Hide Join and Leave Updates"
            subheading="Don’t show when people join or leave the channel."
            value={value}
            disabled={disabled}
            onToggle={onToggle}
        />
    )
}

export const CreateChannelFormContainer = ({
    spaceId,
    onHide,
    hideOnCreation,
}: Omit<Props, 'onCreateChannel'> & { hideOnCreation?: boolean }) => {
    const navigate = useNavigate()

    const { isTouch } = useDevice()

    const onCreateChannel = useCallback(
        (roomId: string) => {
            console.log('[CreateChannelForm]', 'onCreateChannel', roomId)

            const channelPath = `/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/${
                PATHS.CHANNELS
            }/${roomId}`

            navigate(
                `${channelPath}${!isTouch ? `/?panel=${CHANNEL_INFO_PARAMS.CHANNEL_INFO}` : ``}`,
            )
            if (hideOnCreation) {
                onHide()
            }
        },
        [hideOnCreation, isTouch, navigate, onHide, spaceId],
    )

    return (
        <PrivyWrapper>
            <>
                <CreateChannelForm
                    spaceId={spaceId}
                    onHide={onHide}
                    onCreateChannel={onCreateChannel}
                />
                <UserOpTxModal />
            </>
        </PrivyWrapper>
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
