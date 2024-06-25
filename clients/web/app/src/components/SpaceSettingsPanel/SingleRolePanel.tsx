import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Address,
    BlockchainTransactionType,
    NoopRuleData,
    Permission,
    createOperationsTree,
    useCreateRoleTransaction,
    useDeleteRoleTransaction,
    useIsTransactionPending,
    useRoleDetails,
    useUpdateRoleTransaction,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { z } from 'zod'
import { FormProvider, SubmitErrorHandler, UseFormReturn, useFormContext } from 'react-hook-form'
import isEqual from 'lodash/isEqual'
import { AnimatePresence } from 'framer-motion'
import { useGetEmbeddedSigner } from '@towns/privy'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { Panel } from '@components/Panel/Panel'
import {
    Button,
    ErrorMessage,
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
    enabledRolePermissions,
    rolePermissionDescriptions,
} from '@components/SpaceSettingsPanel/rolePermissions.const'
import { RoleRow } from '@components/SpaceSettingsPanel/RoleSettingsPermissions'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { TokenSelector } from '@components/Tokens/TokenSelector/TokenSelector'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { useMultipleTokenMetadatasForChainIds } from 'api/lib/collectionMetadata'
import {
    convertRuleDataToTokenFormSchema,
    convertTokenTypeToOperationType,
} from '@components/Tokens/utils'
import { convertToNumber, mapTokenOptionsToTokenDataStruct } from './utils'
import { formSchema } from './schema'
import { UserPillSelector } from './UserPillSelector'
import { SearchInputHeightAdjuster } from './SearchInputHeightAdjuster'

export type RoleFormSchemaType = z.infer<typeof formSchema>

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

    return (
        <Panel label="Roles">
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
                        defaultValues={{
                            // roleDetails is undefined when creating a new role
                            name: roleDetails?.name ?? '',
                            permissions: isCreateRole
                                ? [Permission.Read]
                                : roleDetails?.permissions ?? [],
                            users: roleDetails?.users ?? [],
                            tokens: roleDetails?.ruleData
                                ? convertRuleDataToTokenFormSchema(roleDetails.ruleData)
                                : [],
                        }}
                    >
                        {(hookForm) => {
                            const _form = hookForm as unknown as UseFormReturn<RoleFormSchemaType>

                            return (
                                <>
                                    <FormProvider {..._form}>
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
                                                // TODO: this background
                                                gap={{
                                                    touch: 'md',
                                                    desktop: 'x4',
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
                                                        _form.formState.errors.name
                                                            ? 'error'
                                                            : 'neutral'
                                                    }
                                                    {..._form.register('name')}
                                                />

                                                {/* TODO: re-enable once xchain is working with role permissions */}
                                                {isDefaultMembershipRole ? null : (
                                                    // TODO: there are no tokens for the default membership role, what should we do?
                                                    // <Stack gap>
                                                    //     <Text>Digital Asset Requirement</Text>
                                                    //     <Stack alignSelf="start">
                                                    //         {'//roleDetails?.ruleData'}
                                                    //     </Stack>
                                                    // </Stack>
                                                    <Stack
                                                        position="relative"
                                                        zIndex="tooltipsAbove"
                                                    >
                                                        <TokenSearch isCreateRole={isCreateRole} />
                                                    </Stack>
                                                )}

                                                {!isDefaultMembershipRole && (
                                                    <Stack position="relative" zIndex="tooltips">
                                                        <UserSearch isCreateRole={isCreateRole} />
                                                    </Stack>
                                                )}

                                                <Stack gap="md">
                                                    <Text>Permissions</Text>
                                                    <Stack
                                                        gap="lg"
                                                        background="level2"
                                                        rounded="sm"
                                                        padding="md"
                                                    >
                                                        <PermissionsToggles
                                                            roleDetails={roleDetails}
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

                                        {Object.keys(_form.formState.errors).length > 0 && (
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
    const getSigner = useGetEmbeddedSigner()
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
    children?: React.ReactNode
    isCreateRole: boolean
    roleId?: number
    spaceId: string | undefined
    transactionIsPending: boolean
}) {
    const { handleSubmit, formState, watch } = useFormContext<RoleFormSchemaType>()
    const { defaultValues } = formState
    const watchAllFields = watch()
    // success and error statuses are handled by <BlockchainTxNotifier />
    const { createRoleTransaction } = useCreateRoleTransaction()
    const { updateRoleTransaction } = useUpdateRoleTransaction()
    const getSigner = useGetEmbeddedSigner()

    const isUnchanged = useMemo(() => {
        const def = structuredClone(defaultValues)
        const cur = structuredClone(watchAllFields)
        function sorter(arr: typeof defaultValues | undefined) {
            arr?.permissions?.sort()
            arr?.users?.sort()
            arr?.tokens?.sort()
            arr?.tokens?.forEach((t) => t?.tokenIds?.sort())
        }
        sorter(def)
        sorter(cur)

        return isEqual(def, cur)
    }, [defaultValues, watchAllFields])

    const isDisabled =
        formState.isSubmitting ||
        isUnchanged ||
        Object.keys(formState.errors).length > 0 ||
        (isCreateRole && !watchAllFields.tokens?.length && !watchAllFields.users.length) ||
        transactionIsPending

    const onValid = useEvent(async (data: RoleFormSchemaType) => {
        const signer = await getSigner()

        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        if (!spaceId) {
            return
        }

        const ruleData =
            data.tokens.length > 0
                ? createOperationsTree(
                      data.tokens.map((t) => ({
                          address: t.address as Address,
                          chainId: BigInt(t.chainId),
                          type: convertTokenTypeToOperationType(t.type),
                      })),
                  )
                : NoopRuleData

        if (isCreateRole) {
            await createRoleTransaction(
                spaceId,
                data.name,
                data.permissions,
                data.users,
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
                data.permissions,
                data.users,
                ruleData,
                signer,
            )
        }
    })

    const onInvalid: SubmitErrorHandler<RoleFormSchemaType> = useEvent((errors) => {
        console.log(errors)
    })

    return (
        <Button
            data-testid="submit-button"
            disabled={isDisabled}
            tone={isDisabled ? 'level2' : 'cta1'}
            style={{
                pointerEvents: isDisabled ? 'none' : 'initial',
            }}
            onClick={handleSubmit(onValid, onInvalid)}
        >
            {children}
        </Button>
    )
}

function UserSearch({ isCreateRole }: { isCreateRole: boolean }) {
    const { getValues, setValue, formState } = useFormContext<RoleFormSchemaType>()

    const onSelectionChange = useEvent((addresses: Set<Address>) => {
        setValue('users', Array.from(addresses))
    })

    const initialSelection = useMemo(() => {
        const users = getValues('users')
        if (users.length) {
            return new Set<Address>(users as Address[])
        }
        return new Set<Address>()
    }, [getValues])

    return (
        <Stack gap data-testid="user-search">
            <Text>Search people</Text>
            <SearchInputHeightAdjuster>
                {(inputContainerRef) => (
                    <UserPillSelector
                        initialSelection={initialSelection}
                        // the custom validation is attached to tokens field
                        isValidationError={
                            (formState.errors.tokens &&
                                formState.errors.tokens.message?.includes('token or user')) !==
                            undefined
                        }
                        inputContainerRef={inputContainerRef}
                        onSelectionChange={onSelectionChange}
                    />
                )}
            </SearchInputHeightAdjuster>
        </Stack>
    )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TokenSearch({ isCreateRole }: { isCreateRole: boolean }) {
    const { getValues, setValue, trigger, watch, formState } = useFormContext<RoleFormSchemaType>()
    const valueRef = useRef(false)
    const tokenWatch = watch('tokens')
    const usersWatch = watch('users')
    const hadAValueAtSomePoint = useMemo(() => {
        if (tokenWatch.length) {
            valueRef.current = true
        }
        return valueRef.current
    }, [tokenWatch])

    const initialTokenValues = useMemo(() => {
        const tokens = getValues('tokens')
        if (tokens.length) {
            return tokens
        }
        return []
    }, [getValues])

    const { data: initialTokensData, isLoading: isLoadingInitialTokens } =
        useMultipleTokenMetadatasForChainIds(initialTokenValues)

    useEffect(() => {
        // trigger token validation on either one of these values changes
        // see ./schema.ts for the custom validation via superRefine
        // which doesn't run when the form normally validates in "onChange" mode
        usersWatch
        tokenWatch
        if (isLoadingInitialTokens) {
            return
        }
        if (isCreateRole) {
            if (hadAValueAtSomePoint || formState.isSubmitted) {
                trigger('tokens')
            }
        } else {
            trigger('tokens')
        }
    }, [
        usersWatch,
        tokenWatch,
        isCreateRole,
        hadAValueAtSomePoint,
        formState.isSubmitted,
        trigger,
        isLoadingInitialTokens,
    ])

    const onSelectionChange = useCallback(
        (args: { tokens: TokenDataWithChainId[] }) => {
            const tokenDataArray = mapTokenOptionsToTokenDataStruct(args.tokens)
            setValue('tokens', tokenDataArray)
        },
        [setValue],
    )

    return (
        <Stack gap data-testid="token-search">
            <Text>Digital Asset Requirement</Text>
            {isLoadingInitialTokens ? (
                <Stack centerContent padding>
                    <ButtonSpinner />
                </Stack>
            ) : (
                <>
                    {isCreateRole && (
                        <Stack
                            horizontal
                            background="level2"
                            padding="md"
                            gap="sm"
                            rounded="sm"
                            alignItems="center"
                        >
                            <Icon type="info" color="gray2" size="square_sm" />
                            <Text size="sm">
                                Select at least one digital asset or wallet address for gating this
                                role.
                            </Text>
                        </Stack>
                    )}
                    <TokenSelector
                        initialSelection={initialTokensData}
                        isValidationError={formState.errors.tokens !== undefined}
                        onSelectionChange={onSelectionChange}
                    />
                </>
            )}
        </Stack>
    )
}

function PermissionsToggles({
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
            permissions: formValues.permissions ?? [],
            tokens: formValues.tokens ?? [],
            users: (formValues.users as Address[]) ?? [],
        }
    })

    const onToggleRole = useEvent((permissionId: Permission, value: boolean) => {
        const currentPermissions = role.permissions
        const newPermissions = value
            ? currentPermissions.concat(permissionId)
            : currentPermissions.filter((p) => p !== permissionId)

        setRole((role) => ({
            ...role,
            permissions: newPermissions,
        }))

        setValue('permissions', newPermissions)
    })

    return enabledRolePermissions.map((permissionId: Permission) => {
        return role ? (
            <RoleRow
                permissionId={permissionId}
                role={role}
                defaultToggled={!!role?.permissions.includes(permissionId)}
                metaData={rolePermissionDescriptions[permissionId]}
                key={permissionId}
                disabled={rolePermissionDescriptions[permissionId]?.disabled}
                onToggle={onToggleRole}
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
