import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Address,
    BlockchainTransactionType,
    EVERYONE_ADDRESS,
    IRuleEntitlementV2Base,
    NoopRuleData,
    Permission,
    RoleDetails,
    convertRuleDataV1ToV2,
    createOperationsTree,
    useCreateRoleTransaction,
    useDeleteRoleTransaction,
    useIsTransactionPending,
    useRoleDetails,
    useUpdateRoleTransaction,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { FormProvider, SubmitErrorHandler, useFormContext } from 'react-hook-form'
import isEqual from 'lodash/isEqual'
import { AnimatePresence } from 'framer-motion'
import { useGetEmbeddedSigner } from '@towns/privy'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { Panel } from '@components/Panel/Panel'
import {
    Button,
    ErrorMessage,
    FancyButton,
    FormRender,
    Icon,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import {
    channelPermissionDescriptions,
    enabledChannelPermissions,
    enabledTownPermissions,
    townPermissionDescriptions,
} from '@components/SpaceSettingsPanel/rolePermissions.const'
import { PermissionToggle } from '@components/SpaceSettingsPanel/PermissionToggle'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import {
    convertRuleDataToTokenEntitlementSchema,
    convertRuleDataToTokenSchema,
    convertTokenTypeToOperationType,
    transformQuantityForSubmit,
} from '@components/Tokens/utils'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { RoleFormSchemaType } from '@components/Web3/CreateSpaceForm/types'
import { isEveryoneAddress } from '@components/Web3/utils'
import { useMultipleTokenMetadatasForChainIds } from 'api/lib/collectionMetadata'
import { convertToNumber } from './utils'
import { formSchema } from './schema'

export const SingleRolePanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <SingleRolePanelWithoutAuth />
        </PrivyWrapper>
    )
})

export function SingleRolePanelWithoutAuth() {
    const spaceIdFromPath = useSpaceIdFromPathname()
    const [searchParams] = useSearchParams()
    const rolesParam = searchParams.get('roles')
    const isCreateRole = rolesParam === 'new'
    const roleId = isCreateRole ? undefined : convertToNumber(rolesParam ?? '')

    const { isLoading, roleDetails } = useRoleDetails(spaceIdFromPath ?? '', roleId)
    const { channelRoleDetails, townRoleDetails } = useMemo(() => {
        const channelRoleDetails: RoleDetails | undefined = roleDetails
            ? { ...roleDetails }
            : undefined
        const townRoleDetails: RoleDetails | undefined = roleDetails
            ? { ...roleDetails }
            : undefined
        channelRoleDetails &&
            (channelRoleDetails.permissions = channelRoleDetails.permissions.filter(
                (p) => channelPermissionDescriptions[p],
            ))
        townRoleDetails &&
            (townRoleDetails.permissions = townRoleDetails.permissions.filter(
                (p) => townPermissionDescriptions[p],
            ))
        return {
            channelRoleDetails,
            townRoleDetails,
        }
    }, [roleDetails])
    const [deleteModal, setDeleteModal] = useState(false)
    const hideDeleteModal = () => setDeleteModal(false)
    const showDeleteModal = () => setDeleteModal(true)
    //  the role that is gated by the membership NFT, and is required to enter the space
    const isDefaultMembershipRole = roleDetails?.id === 2

    const pendingCreateRoleTransaction = useIsTransactionPending(
        BlockchainTransactionType.CreateRole,
    )
    const pendingUpdateRoleTransaction = useIsTransactionPending(
        BlockchainTransactionType.UpdateRole,
    )
    const pendingDeleteRoleTransaction = useIsTransactionPending(
        BlockchainTransactionType.DeleteRole,
    )

    const transactionIsPending =
        pendingCreateRoleTransaction || pendingUpdateRoleTransaction || pendingDeleteRoleTransaction

    const defaultChannelPermissionsValues = useMemo(() => {
        if (!channelRoleDetails) {
            return []
        }

        const { permissions } = channelRoleDetails
        // for existing roles pre react permission, add it if write is present
        const defaultP = permissions.includes(Permission.Write)
            ? permissions.concat(Permission.React)
            : permissions
        return [...new Set(defaultP)]
    }, [channelRoleDetails])

    const ruleData: IRuleEntitlementV2Base.RuleDataV2Struct | undefined =
        roleDetails?.ruleData.kind === 'v1'
            ? convertRuleDataV1ToV2(roleDetails.ruleData.rules)
            : roleDetails?.ruleData.rules

    const initialTokenValues = useMemo(
        () => (ruleData ? convertRuleDataToTokenSchema(ruleData) : []),
        [ruleData],
    )

    const { data: clientTokensGatedBy, isLoading: isLoadingTokensData } =
        useMultipleTokenMetadatasForChainIds(initialTokenValues)

    const usersGatedBy = useMemo(() => {
        return (roleDetails?.users || []).filter(
            (address) => !isEveryoneAddress(address),
        ) as Address[]
    }, [roleDetails])

    const gatingType = useMemo(() => {
        if (isCreateRole) {
            return 'everyone'
        }
        if (initialTokenValues.length > 0) {
            return 'gated'
        }
        return roleDetails?.users?.some((address) => !isEveryoneAddress(address))
            ? 'gated'
            : 'everyone'
    }, [isCreateRole, roleDetails, initialTokenValues.length])

    const values: RoleFormSchemaType = useMemo(
        () => ({
            name: roleDetails?.name || '',
            channelPermissions: isCreateRole
                ? [Permission.Read, Permission.React]
                : defaultChannelPermissionsValues,
            townPermissions: townRoleDetails?.permissions ?? [],
            tokensGatedBy: ruleData ? convertRuleDataToTokenEntitlementSchema(ruleData) : [],
            clientTokensGatedBy,
            gatingType,
            usersGatedBy,
        }),
        [
            roleDetails,
            isCreateRole,
            defaultChannelPermissionsValues,
            townRoleDetails,
            clientTokensGatedBy,
            gatingType,
            usersGatedBy,
            ruleData,
        ],
    )

    if (isLoadingTokensData) {
        return <ButtonSpinner />
    }

    return (
        <Panel label="Roles" padding="none">
            {isLoading ? (
                <Stack grow centerContent>
                    <ButtonSpinner />
                </Stack>
            ) : (
                <Stack height="100%" overflow="hidden">
                    <FormRender
                        schema={formSchema}
                        id="RoleForm"
                        mode="onChange"
                        height="100%"
                        defaultValues={values}
                    >
                        {(form) => {
                            return (
                                <>
                                    <FormProvider {...form}>
                                        <Stack
                                            grow
                                            overflow="auto"
                                            gap={{
                                                touch: 'md',
                                                desktop: 'lg',
                                            }}
                                            background="level1"
                                        >
                                            <Stack
                                                overflow="auto"
                                                padding="md"
                                                gap={{
                                                    touch: 'md',
                                                    desktop: 'lg',
                                                }}
                                                rounded="sm"
                                            >
                                                {isDefaultMembershipRole && (
                                                    <Stack
                                                        horizontal
                                                        background="level2"
                                                        padding="md"
                                                        gap="sm"
                                                        rounded="sm"
                                                        alignItems="center"
                                                    >
                                                        <Icon
                                                            type="info"
                                                            color="gray2"
                                                            size="square_sm"
                                                        />
                                                        <Text size="sm">
                                                            This is a default role. Anyone who mints
                                                            a town membership will be assigned this
                                                            role.
                                                        </Text>
                                                    </Stack>
                                                )}
                                                <TextField
                                                    autoFocus
                                                    data-testid="role-name"
                                                    background="level2"
                                                    placeholder="Enter a name for the role..."
                                                    renderLabel={(label) => <Text>{label}</Text>}
                                                    label="Role name"
                                                    tone={
                                                        form.formState.errors.name
                                                            ? 'error'
                                                            : 'neutral'
                                                    }
                                                    {...form.register('name')}
                                                />

                                                {isDefaultMembershipRole ? null : (
                                                    <Stack
                                                        position="relative"
                                                        zIndex="tooltipsAbove"
                                                        gap="md"
                                                    >
                                                        <Text>Who Gets Access</Text>
                                                        <EditGating isRole />
                                                    </Stack>
                                                )}

                                                <Stack gap="md" data-testid="channel-permissions">
                                                    <Text>Channel Permissions</Text>
                                                    <Stack
                                                        gap="lg"
                                                        background="level2"
                                                        rounded="sm"
                                                        padding="md"
                                                    >
                                                        <ChannelPermissionsToggles
                                                            roleDetails={channelRoleDetails}
                                                        />
                                                    </Stack>
                                                </Stack>
                                                <Stack gap="md" data-testid="town-permissions">
                                                    <Text>Town Permissions</Text>
                                                    <Stack
                                                        gap="lg"
                                                        background="level2"
                                                        rounded="sm"
                                                        padding="md"
                                                    >
                                                        <TownPermissionsToggles
                                                            roleDetails={townRoleDetails}
                                                        />
                                                    </Stack>
                                                </Stack>

                                                {!isCreateRole && !isDefaultMembershipRole && (
                                                    <Stack>
                                                        <Button
                                                            color="error"
                                                            tone="level2"
                                                            justifyContent="start"
                                                            data-testid="delete-role-button"
                                                            disabled={transactionIsPending}
                                                            onClick={showDeleteModal}
                                                        >
                                                            <Icon type="delete" />
                                                            Delete Role
                                                        </Button>
                                                    </Stack>
                                                )}
                                            </Stack>
                                        </Stack>

                                        <Stack padding="md" paddingTop="sm">
                                            <SubmitButton
                                                isCreateRole={isCreateRole}
                                                roleId={roleId}
                                                spaceId={spaceIdFromPath}
                                                transactionIsPending={transactionIsPending}
                                            >
                                                {isCreateRole ? 'Create Role' : 'Save Role'}
                                            </SubmitButton>
                                        </Stack>

                                        {Object.keys(form.formState.errors).length > 0 && (
                                            <ErrorsNotification />
                                        )}
                                    </FormProvider>
                                </>
                            )
                        }}
                    </FormRender>
                    {deleteModal && (
                        <DeleteRoleModal
                            hideDeleteModal={hideDeleteModal}
                            spaceId={spaceIdFromPath}
                            roleId={roleId}
                        />
                    )}
                </Stack>
            )}
            {transactionIsPending && (
                <Stack zIndex="tooltipsAbove">
                    <FullPanelOverlay withSpinner={false} />
                </Stack>
            )}

            <UserOpTxModal />
        </Panel>
    )
}

function DeleteRoleModal({
    hideDeleteModal,
    spaceId,
    roleId,
}: {
    spaceId: string | undefined
    roleId: number | undefined
    hideDeleteModal: () => void
}) {
    // success and error statuses are handled by <BlockchainTxNotifier />
    const { deleteRoleTransaction } = useDeleteRoleTransaction()
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const onDelete = useEvent(async () => {
        if (!spaceId || !roleId) {
            return
        }
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        hideDeleteModal()
        await deleteRoleTransaction(spaceId, roleId, signer)
    })

    return (
        <ModalContainer minWidth="400" onHide={hideDeleteModal}>
            <Stack gap="x4" padding="sm">
                <Paragraph strong>Are you sure you want to delete this role?</Paragraph>
                <Paragraph>This action cannot be undone.</Paragraph>
                <Stack horizontal gap alignSelf="end">
                    <Button onClick={hideDeleteModal}>Cancel</Button>
                    <Button
                        tone="error"
                        data-testid="confirm-delete-role-button"
                        disabled={!isPrivyReady}
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}

function SubmitButton({
    children,
    isCreateRole,
    roleId,
    spaceId,
    transactionIsPending,
}: {
    children?: string
    isCreateRole: boolean
    roleId?: number
    spaceId: string | undefined
    transactionIsPending: boolean
}) {
    const { handleSubmit, formState, watch } = useFormContext<RoleFormSchemaType>()
    const { defaultValues } = formState
    const watchAllFields = watch()
    const { createRoleTransaction } = useCreateRoleTransaction()
    const { updateRoleTransaction } = useUpdateRoleTransaction()
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()

    const isUnchanged = useMemo(() => {
        const def = structuredClone(defaultValues)
        const cur = structuredClone(watchAllFields)
        const sorter = (arr: typeof defaultValues | undefined) => {
            arr?.channelPermissions?.sort()
            arr?.townPermissions?.sort()
            arr?.usersGatedBy?.sort()
            arr?.clientTokensGatedBy?.sort()
        }
        sorter(def)
        sorter(cur)
        return isEqual(def, cur)
    }, [defaultValues, watchAllFields])

    const isDisabled =
        !isPrivyReady ||
        formState.isSubmitting ||
        isUnchanged ||
        Object.keys(formState.errors).length > 0 ||
        (watchAllFields.gatingType === 'gated' &&
            !watchAllFields.clientTokensGatedBy?.length &&
            !watchAllFields.usersGatedBy.length) ||
        transactionIsPending

    const onValid = useEvent(async (data: RoleFormSchemaType) => {
        if (!spaceId) {
            return
        }

        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }

        // just in case
        const _channelPermissions = [...new Set(data.channelPermissions)].sort()
        const _townPermissions = [...new Set(data.townPermissions)].sort()

        // If gatedType is everyone, usersGatedBy should be the everyone address
        const usersGatedBy = data.gatingType === 'everyone' ? [EVERYONE_ADDRESS] : data.usersGatedBy

        // If gatedType is everyone, tokensGatedBy should be empty
        const tokensGatedBy = data.gatingType === 'everyone' ? [] : data.clientTokensGatedBy

        const ruleData =
            tokensGatedBy.length > 0
                ? createOperationsTree(
                      tokensGatedBy.map((t) => ({
                          address: t.data.address as Address,
                          chainId: BigInt(t.chainId),
                          type: convertTokenTypeToOperationType(t.data.type),
                          threshold: t.data.quantity
                              ? transformQuantityForSubmit(
                                    t.data.quantity,
                                    t.data.type,
                                    t.data.decimals,
                                )
                              : 1n,
                          tokenId: t.data.tokenId ? BigInt(t.data.tokenId) : undefined,
                      })),
                  )
                : NoopRuleData

        if (isCreateRole) {
            await createRoleTransaction(
                spaceId,
                data.name,
                [..._channelPermissions, ..._townPermissions],
                usersGatedBy,
                ruleData,
                signer,
            )
        } else {
            if (!roleId) {
                console.error('No roleId for edit role.')
                return
            }
            await updateRoleTransaction(
                spaceId,
                roleId,
                data.name,
                [..._channelPermissions, ..._townPermissions],
                usersGatedBy,
                ruleData,
                signer,
            )
        }
    })

    const onInvalid: SubmitErrorHandler<RoleFormSchemaType> = useEvent((errors) => {
        console.error(errors)
    })

    return (
        <FancyButton
            cta
            data-testid="submit-button"
            disabled={isDisabled}
            onClick={handleSubmit(onValid, onInvalid)}
        >
            {children}
        </FancyButton>
    )
}

export function ChannelPermissionsToggles({
    roleDetails,
    onPermissionChange,
}: {
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails']
    onPermissionChange?: (permissions: Permission[]) => void
}) {
    const { setValue, getValues } = useFormContext<RoleFormSchemaType>()

    // use the default form values, which map to the roleDetails
    const formValues = getValues()

    // TODO: once SpaceSettings is gone and RoleRow lives here only, we can refactor RoleRow to just use the initial permissions of the form
    // and pass only the permissions to the row, no need to pass the whole role

    const [role, setRole] = useState(() => {
        return {
            id: roleDetails?.id.toString() ?? '',
            name: formValues.name,
            permissions: formValues.channelPermissions ?? [],
            tokensGatedBy: formValues.tokensGatedBy ?? [],
            clientTokensGatedBy: formValues.clientTokensGatedBy ?? [],
            usersGatedBy: (formValues.usersGatedBy as Address[]) ?? [],
        }
    })

    const onToggleChannelPermissions = useEvent((permissionId: Permission, isChecked: boolean) => {
        const newPermissions = createNewChannelPermissions(
            formValues.channelPermissions,
            permissionId,
            isChecked,
        )

        setRole((role) => ({
            ...role,
            permissions: newPermissions,
        }))

        setValue('channelPermissions', newPermissions)

        onPermissionChange?.(newPermissions)
    })

    return enabledChannelPermissions.map((permissionId: Permission) => {
        const isDisabled =
            permissionId === Permission.Read ||
            (permissionId === Permission.React && role.permissions.includes(Permission.Write))
        return role ? (
            <PermissionToggle
                permissionId={permissionId}
                defaultToggled={!!formValues.channelPermissions.includes(permissionId)}
                metaData={channelPermissionDescriptions[permissionId]}
                key={permissionId}
                disabled={isDisabled}
                onToggle={onToggleChannelPermissions}
            />
        ) : null
    })
}

function TownPermissionsToggles({
    roleDetails,
}: {
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails']
}) {
    const { setValue, getValues } = useFormContext<RoleFormSchemaType>()

    // TODO: once SpaceSettings is gone and RoleRow lives here only, we can refactor RoleRow to just use the initial permissions of the form
    // and pass only the permissions to the row, no need to pass the whole role

    const [role, setRole] = useState(() => {
        // use the default form values, which map to the roleDetails
        const formValues = getValues()

        return {
            id: roleDetails?.id.toString() ?? '',
            name: formValues.name,
            permissions: formValues.townPermissions ?? [],
            tokensGatedBy: formValues.tokensGatedBy ?? [],
            clientTokensGatedBy: formValues.clientTokensGatedBy ?? [],
            usersGatedBy: (formValues.usersGatedBy as Address[]) ?? [],
        }
    })

    const onToggleTownPermissions = useEvent((permissionId: Permission, value: boolean) => {
        const currentPermissions = role.permissions
        const newPermissions = value
            ? currentPermissions.concat(permissionId)
            : currentPermissions.filter((p) => p !== permissionId)

        setRole((role) => ({
            ...role,
            permissions: newPermissions,
        }))

        setValue('townPermissions', newPermissions)
    })

    return enabledTownPermissions.map((permissionId: Permission) => {
        return role ? (
            <PermissionToggle
                permissionId={permissionId}
                defaultToggled={!!role?.permissions?.includes(permissionId)}
                metaData={townPermissionDescriptions[permissionId]}
                key={permissionId}
                disabled={townPermissionDescriptions[permissionId]?.disabled}
                onToggle={onToggleTownPermissions}
            />
        ) : null
    })
}

function ErrorsNotification() {
    const { formState } = useFormContext<RoleFormSchemaType>()
    const { errors } = formState

    return (
        <AnimatePresence>
            <MotionStack
                display="block"
                position="absolute"
                right="md"
                bottom="md"
                transition={{
                    duration: 0.2,
                }}
                variants={{
                    hide: { opacity: 0 },
                    show: { opacity: 1 },
                }}
                width="300"
                initial="hide"
                animate="show"
                exit="hide"
                zIndex="tooltipsAbove"
            >
                <Stack
                    horizontal
                    gap
                    alignItems="center"
                    background="level2"
                    padding="md"
                    rounded="sm"
                    border="default"
                    boxShadow="card"
                >
                    <Icon color="error" type="alert" />
                    <Stack gap>
                        {Object.keys(errors).map((key) => {
                            return (
                                <ErrorMessage
                                    key={key}
                                    errors={errors}
                                    fieldName={key as keyof RoleFormSchemaType}
                                />
                            )
                        })}
                    </Stack>
                </Stack>
            </MotionStack>
        </AnimatePresence>
    )
}

function createNewChannelPermissions(
    permissions: Permission[],
    permissionId: Permission,
    value: boolean,
) {
    let _permissions: Permission[]
    if (permissionId === Permission.Write && value) {
        // add write + react - can't react w/o write
        _permissions = permissions.concat(permissionId, Permission.React)
    } else {
        _permissions = value
            ? permissions.concat(permissionId)
            : permissions.filter((p) => p !== permissionId)
    }
    return [...new Set(_permissions)]
}
