import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Address,
    BlockchainTransactionType,
    Permission,
    useCreateRoleTransaction,
    useDeleteRoleTransaction,
    useIsTransactionPending,
    useRoleDetails,
    useUpdateRoleTransaction,
} from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { z } from 'zod'
import { FormProvider, SubmitErrorHandler, UseFormReturn, useFormContext } from 'react-hook-form'
import isEqual from 'lodash/isEqual'
import { AnimatePresence } from 'framer-motion'
import { useGetEmbeddedSigner } from '@towns/privy'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { Panel } from '@components/Panel/Panel'
import {
    Button,
    ErrorMessage,
    FormRender,
    Icon,
    IconButton,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { useAuth } from 'hooks/useAuth'
import { fetchMainnetTokens, mainnetTokenAddress } from 'hooks/useNetworkForNftApi'
import { useCollectionsForOwner } from 'api/lib/tokenContracts'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import {
    enabledRolePermissions,
    rolePermissionDescriptions,
} from '@components/SpaceSettings/RoleSettings/rolePermissions.const'
import { RoleRow } from '@components/SpaceSettings/RoleSettings/RoleSettingsPermissions'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { createTokenEntitlementStruct } from '@components/Web3/utils'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { convertToNumber, splitKeyToContractAddressAndTokenId } from './utils'
import { formSchema } from './schema'
import { TokenPillSelector } from './TokenPillSelector'
import { UserPillSelector } from './UserPillSelector'

export type RoleFormSchemaType = z.infer<typeof formSchema>

export function SingleRolePanel() {
    const spaceIdFromPath = useSpaceIdFromPathname()
    const [searchParams, setSearchParams] = useSearchParams()
    const rolesParam = searchParams.get('roles')
    const isCreateRole = rolesParam === 'new'
    const roleId = isCreateRole ? undefined : convertToNumber(rolesParam ?? '')

    const { isLoading, roleDetails } = useRoleDetails(spaceIdFromPath ?? '', roleId)
    const onCloseClick = useEvent(() => {
        searchParams.set('roles', '')
        setSearchParams(searchParams)
    })
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
        <Panel
            label="Roles"
            leftBarButton={<IconButton icon="arrowLeft" onClick={onCloseClick} />}
            onClose={onCloseClick}
        >
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
                            tokens:
                                roleDetails?.tokens?.map((t) => ({
                                    contractAddress: t.contractAddress as string,
                                    tokenIds: t.tokenIds as number[],
                                })) ?? [],
                            permissions: isCreateRole ? ['Read'] : roleDetails?.permissions ?? [],
                            users: roleDetails?.users ?? [],
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

                                                <Stack position="relative" zIndex="tooltipsAbove">
                                                    <TokenSearch isCreateRole={isCreateRole} />
                                                </Stack>

                                                <Stack position="relative" zIndex="tooltips">
                                                    <UserSearch isCreateRole={isCreateRole} />
                                                </Stack>

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
            console.error('No signer for delete role.')
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
        transactionIsPending

    const onValid = useEvent(async (data: RoleFormSchemaType) => {
        const signer = await getSigner()

        if (!signer) {
            console.error('No signer for create or edit role.')
            return
        }
        if (!spaceId) {
            return
        }

        if (isCreateRole) {
            await createRoleTransaction(
                spaceId,
                data.name,
                data.permissions,
                data.tokens.map((t) =>
                    createTokenEntitlementStruct({
                        contractAddress: t.contractAddress,
                        tokenIds: t.tokenIds,
                    }),
                ),
                data.users,
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
                data.tokens.map((t) =>
                    createTokenEntitlementStruct({
                        contractAddress: t.contractAddress,
                        tokenIds: t.tokenIds,
                    }),
                ),
                data.users,
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
    const { getValues, setValue, trigger, formState, watch } = useFormContext<RoleFormSchemaType>()
    const valueRef = useRef(false)
    const usersWatch = watch('users')
    const hadAValueAtSomePoint = useMemo(() => {
        if (usersWatch.length) {
            valueRef.current = true
        }
        return valueRef.current
    }, [usersWatch])

    const onSelectionChange = useEvent((addresses: Set<Address>) => {
        setValue('users', Array.from(addresses))
        // trigger tokens validation b/c the schema contains a custom validation that requires at least one token or user
        // and this timeout is a hack to make sure the tokens validation runs after the users are updated
        setTimeout(() => {
            if (isCreateRole) {
                if (hadAValueAtSomePoint) {
                    trigger('tokens')
                }
            } else {
                trigger('tokens')
            }
        })
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
            <SearchHeightAdjuster>
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
            </SearchHeightAdjuster>
        </Stack>
    )
}

function TokenSearch({ isCreateRole }: { isCreateRole: boolean }) {
    const { chainId } = useEnvironment()
    // TODO: this should probably be the "primary wallet" the user links
    const { loggedInWalletAddress } = useAuth()
    const { getValues, setValue, trigger, watch, formState } = useFormContext<RoleFormSchemaType>()
    const valueRef = useRef(false)
    const tokenWatch = watch('tokens')
    const hadAValueAtSomePoint = useMemo(() => {
        if (tokenWatch.length) {
            valueRef.current = true
        }
        return valueRef.current
    }, [tokenWatch])

    const {
        data: nftApiData,
        isLoading,
        isError,
    } = useCollectionsForOwner({
        wallet:
            (fetchMainnetTokens && mainnetTokenAddress
                ? mainnetTokenAddress
                : loggedInWalletAddress) ?? '',
        enabled: Boolean(chainId),
        chainId,
    })

    const initialSelection = useMemo(() => {
        if (isLoading) {
            return new Set<string>()
        }
        const tokens = getValues('tokens')
        const selectedTokens = new Set<string>()
        // map tokens to a string like <address>__TOKEN_ID__<token_id>
        tokens.forEach((token: TokenDataStruct) => {
            if (token.tokenIds.length) {
                token.tokenIds.forEach((tokenId) => {
                    selectedTokens.add(`${token.contractAddress}__TOKEN_ID__${tokenId}`)
                })
            } else {
                selectedTokens.add(token.contractAddress)
            }
        })
        return selectedTokens
    }, [getValues, isLoading])

    const onSelectionChange = useCallback(
        (tokens: Set<string>) => {
            // tokens is a set of strings like <address>__TOKEN_ID__<token_id> "0x1234__TOKEN_ID__1"
            // token_id is needed for ERC1155 tokens
            const tokenDataArray: TokenDataStruct[] = []
            tokens.forEach((tokenIdString) => {
                const [contractAddress, tokenId] =
                    splitKeyToContractAddressAndTokenId(tokenIdString)
                if (!contractAddress) {
                    return
                }
                const match = tokenDataArray.find((x) => x.contractAddress === contractAddress)

                if (match) {
                    if (tokenId !== undefined) {
                        match.tokenIds.push(+tokenId)
                    }
                } else {
                    tokenDataArray.push({
                        contractAddress,
                        tokenIds: tokenId !== undefined ? [+tokenId] : [],
                    })
                }

                if (match?.tokenIds.length) {
                    match.tokenIds = Array.from(new Set(match.tokenIds))
                }
            })

            setValue('tokens', tokenDataArray)
            // trigger validation
            setTimeout(() => {
                if (isCreateRole) {
                    if (hadAValueAtSomePoint) {
                        trigger('tokens')
                    }
                } else {
                    trigger('tokens')
                }
            })
        },
        [setValue, isCreateRole, hadAValueAtSomePoint, trigger],
    )

    return (
        <Stack gap data-testid="token-search">
            <Text>Digital Asset Requirement</Text>
            {isLoading ? (
                <Stack height="x4">
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
                    <SearchHeightAdjuster>
                        {(inputContainerRef) => (
                            <TokenPillSelector
                                isValidationError={formState.errors.tokens !== undefined}
                                initialSelection={initialSelection}
                                inputContainerRef={inputContainerRef}
                                nftApiData={nftApiData}
                                isNftApiError={isError}
                                onSelectionChange={onSelectionChange}
                            />
                        )}
                    </SearchHeightAdjuster>
                </>
            )}
        </Stack>
    )
}

function SearchHeightAdjuster({
    children,
}: {
    children: (inputContainerRef: React.RefObject<HTMLDivElement>) => React.ReactNode
}) {
    const inputContainerRef = useRef<HTMLDivElement>(null)

    return (
        <Stack position="relative">
            {/* default to 48 px, the height of the text input */}
            <Stack style={{ height: inputContainerRef.current?.clientHeight ?? 48 }} />
            {/* absolute so dropdown flows over rest of form */}
            <Stack position="absolute" left="none" right="none" overflow="visible">
                {children(inputContainerRef)}
            </Stack>
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
            tokens: (formValues.tokens as TokenDataStruct[]) ?? [],
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
