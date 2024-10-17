import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    BlockchainTransactionType,
    Permission,
    useIsTransactionPending,
    useRoleDetails,
} from 'use-towns-client'
import { FormProvider, useFormContext } from 'react-hook-form'
import { AnimatePresence } from 'framer-motion'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { Panel } from '@components/Panel/Panel'
import { Button, ErrorMessage, FormRender, Icon, MotionStack, Stack, Text, TextField } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { RoleFormSchemaType } from '@components/Web3/CreateSpaceForm/types'
import { convertToNumber } from './utils'
import { formSchema } from './schema'
import { useChannelAndTownRoleDetails, useGatingInfo } from './hooks'
import { SingleRolePanelSubmitButton } from './SingleRolePanelSubmitButton'
import { ChannelPermissionsToggles } from './ChannelPermissionsToggles'
import { DeleteRoleModal } from './DeleteRoleModal'
import { TownPermissionsToggles } from './TownPermissionsToggles'

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

    const { channelRoleDetails, townRoleDetails, defaultChannelPermissionsValues } =
        useChannelAndTownRoleDetails(roleDetails)

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

    const { gatingType, usersGatedBy, tokensGatedBy, ethBalanceGatedBy, isTokensGatedByLoading } =
        useGatingInfo(roleDetails)

    const values: RoleFormSchemaType = useMemo(
        () => ({
            name: roleDetails?.name || '',
            channelPermissions: isCreateRole
                ? [Permission.Read, Permission.React]
                : defaultChannelPermissionsValues,
            townPermissions: townRoleDetails?.permissions ?? [],
            gatingType,
            tokensGatedBy,
            usersGatedBy,
            ethBalanceGatedBy,
        }),
        [
            roleDetails,
            isCreateRole,
            defaultChannelPermissionsValues,
            townRoleDetails,
            gatingType,
            usersGatedBy,
            tokensGatedBy,
            ethBalanceGatedBy,
        ],
    )

    if (isTokensGatedByLoading) {
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
                                            <SingleRolePanelSubmitButton
                                                isCreateRole={isCreateRole}
                                                roleId={roleId}
                                                spaceId={spaceIdFromPath}
                                                transactionIsPending={transactionIsPending}
                                            >
                                                {isCreateRole ? 'Create Role' : 'Save Role'}
                                            </SingleRolePanelSubmitButton>
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
