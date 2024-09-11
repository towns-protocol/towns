import {
    CreateChannelInfo,
    IRuleEntitlementV2Base,
    Permission,
    SignerUndefinedError,
    TransactionStatus,
    WalletDoesNotMatchSignedInAccountError,
    convertRuleDataV1ToV2,
    useConnectivity,
    useCreateChannelTransaction,
    useHasPermission,
    useMultipleRoleDetails,
} from 'use-towns-client'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Toast, toast } from 'react-hot-toast/headless'
import { ApiObject } from '@rudderstack/analytics-js/*'
import { UseFormReturn } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { PrivyWrapper } from 'privy/PrivyProvider'
import {
    Box,
    Button,
    Checkbox,
    ErrorMessage,
    FancyButton,
    FormRender,
    Icon,
    IconButton,
    Paragraph,
    Stack,
    Text,
    TextField,
    Toggle,
} from '@ui'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { TransactionUIState, toTransactionUIStates } from 'hooks/TransactionUIState'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { Spinner } from '@components/Spinner'

import { convertRuleDataToTokenFormSchema } from '@components/Tokens/utils'
import { useContractRoles } from 'hooks/useContractRoles'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { Analytics } from 'hooks/useAnalytics'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { PanelButton } from '@components/Panel/PanelButton'
import { useChangePermissionOverridesStore } from '@components/ChannelSettings/useChangePermissionOverridesStore'
import { atoms } from 'ui/styles/atoms.css'
import { PersistForm, usePeristedFormValue } from 'ui/components/Form/PersistForm'
import { isChannelPermission } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { mapToErrorMessage } from '../utils'

type Props = {
    spaceId: string
    onCreateChannel: (roomId: string) => void
    onHide: () => void
}

type FormState = z.infer<typeof schema>

const schema = z.object({
    name: z.string().min(2, 'Channel names must have at least 2 characters'),
    topic: z.string(),
    roleIds: z.string().array().nonempty('Please select at least one role'),
    autojoin: z.boolean().default(false),
    hideUserJoinLeaveEvents: z.boolean().default(false),
})

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

    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()

    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(channelId))
    const isAbleToInteract = isPrivyReady && transactionUIState === TransactionUIState.None

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
        <FormRender<FormState>
            schema={schema}
            defaultValues={
                formData ?? {
                    name: '',
                    roleIds: firstRoleIDWithReadPermission ? [firstRoleIDWithReadPermission] : [],
                }
            }
            mode="onChange"
            onSubmit={async ({ name, topic, roleIds, autojoin, hideUserJoinLeaveEvents }) => {
                const signer = await getSigner()
                const _roleIds = roleIds.map((roleId) => Number(roleId))
                const channelInfo = {
                    name: name,
                    topic: topic,
                    parentSpaceId: props.spaceId,
                    roles: _roleIds.map((r) => ({
                        roleId: r,
                        permissions: channelFormPermissionOverrides?.[r]?.permissions ?? [],
                    })),
                    channelSettings: {
                        hideUserJoinLeaveEvents,
                        autojoin,
                    },
                } satisfies CreateChannelInfo

                const _rolesWithDetails =
                    (_roleIds
                        .map((roleId): ApiObject | undefined => {
                            const r = rolesWithDetails?.find((role) => role.id === roleId)
                            if (r) {
                                const { ruleData } = r

                                const ruleDataV2:
                                    | IRuleEntitlementV2Base.RuleDataV2Struct
                                    | undefined =
                                    ruleData.kind === 'v1'
                                        ? convertRuleDataV1ToV2(ruleData.rules)
                                        : ruleData.rules

                                const tokens = convertRuleDataToTokenFormSchema(ruleDataV2).map(
                                    (t) => {
                                        return {
                                            chainId: t.chainId,
                                            contractAddress: t.address,
                                            opType: t.type,
                                            threshold: t.quantity.toString(),
                                        } as ApiObject
                                    },
                                )
                                return {
                                    id: r.id,
                                    name: r.name,
                                    permissions: r.permissions,
                                    users: r.users,
                                    tokens,
                                }
                            }
                            return undefined
                        })
                        .filter((r) => r !== undefined) as ApiObject[]) ?? []
                const tracked = {
                    channelName: name,
                    parentSpaceId: props.spaceId,
                    rolesWithDetails: _rolesWithDetails,
                }
                Analytics.getInstance().track('submitting create channel form', tracked, () => {
                    console.log('[analytics] submitting create channel form', tracked)
                })

                if (!signer) {
                    createPrivyNotAuthenticatedNotification()
                    return
                }

                const txResult = await createChannelTransaction(channelInfo, signer)

                console.log('[CreateChannelForm]', 'createChannelTransaction result', txResult)
                if (txResult?.status === TransactionStatus.Success) {
                    invalidateQuery()
                    const channelId = txResult.data
                    const trackCreated = {
                        ...tracked,
                        channelId,
                    }
                    if (channelId) {
                        Analytics.getInstance().track('created channel', trackCreated, () => {
                            console.log('[analytics] created channel', trackCreated)
                        })
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
            {(hookForm) => {
                const _form = hookForm satisfies UseFormReturn<FormState>

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
                                renderLabel={(label) => (
                                    <Text as="label" for="name">
                                        {label}
                                    </Text>
                                )}
                                placeholder="channel-name"
                                maxLength={30}
                                message={
                                    <ErrorMessage<FormState>
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
                                <PanelButton onClick={onCreateNewRole}>
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

                                <FancyButton
                                    cta={isAbleToInteract}
                                    type="submit"
                                    disabled={!isAbleToInteract}
                                    spinner={!isAbleToInteract}
                                >
                                    {!isAbleToInteract ? 'Creating' : 'Create Channel'}
                                </FancyButton>
                            </Stack>
                        ) : (
                            <Stack
                                padding
                                position="absolute"
                                bottom="none"
                                left="none"
                                right="none"
                            >
                                <FancyButton
                                    cta={isAbleToInteract && formState.isValid}
                                    type="submit"
                                    disabled={!isAbleToInteract}
                                    spinner={!isAbleToInteract}
                                >
                                    {isAbleToInteract ? 'Create Channel' : 'Creating'}
                                </FancyButton>
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

    const onCreateChannel = useCallback(
        (roomId: string) => {
            console.log('[CreateChannelForm]', 'onCreateChannel', roomId)
            navigate(
                `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${roomId}/?panel=${CHANNEL_INFO_PARAMS.CHANNEL_INFO}`,
            )
            if (hideOnCreation) {
                onHide()
            }
        },
        [navigate, spaceId, onHide, hideOnCreation],
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
