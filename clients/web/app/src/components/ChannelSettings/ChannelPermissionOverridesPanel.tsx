import { useGetEmbeddedSigner } from '@towns/privy'
import isEqual from 'lodash/isEqual'
import React, { useMemo, useState } from 'react'
import { FormProvider, SubmitErrorHandler, UseFormReturn, useFormContext } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    BlockchainTransactionType,
    Permission,
    RoleDetails,
    useChannelId,
    useIsTransactionPending,
    usePermissionOverrides,
    useRoleDetails,
    useSetChannelPermissionOverrides,
    useSpaceId,
} from 'use-towns-client'
import { useClearChannelPermissionOverrides } from 'use-towns-client/dist/hooks/use-set-channel-permission-overrides'
import { z } from 'zod'
import { atoms } from 'ui/styles/atoms.css'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { Box, FancyButton, FormRender, Icon, Paragraph, Stack, Text, TextButton } from '@ui'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { ChannelPermissionsToggles } from '@components/SpaceSettingsPanel/SingleRolePanel'
import { Panel } from '@components/Panel/Panel'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useChangePermissionOverridesStore } from './useChangePermissionOverridesStore'

export const formSchema = z.object({
    channelPermissions: z.array(z.nativeEnum(Permission)),
})

export type RoleOverrideFormSchemaType = z.infer<typeof formSchema>

export const ChannelPermissionOverridesPanel = React.memo((props: { roleId: number }) => {
    const { roleId } = props
    const spaceId = useSpaceId()

    if (!spaceId) {
        throw new Error('Missing required data')
    }

    const { isLoading, roleDetails } = useRoleDetails(spaceId, roleId)

    const hasPendingTx = useIsTransactionPending(
        BlockchainTransactionType.SetChannelPermissionOverrides,
        BlockchainTransactionType.ClearChannelPermissionOverrides,
    )

    return (
        <PrivyWrapper>
            <Panel label="Edit Channel Permissions">
                <Form
                    spaceId={spaceId}
                    roleId={roleId}
                    roleDetails={roleDetails}
                    isLoading={isLoading}
                />
                {(hasPendingTx || isLoading) && <FullPanelOverlay />}
            </Panel>
        </PrivyWrapper>
    )
})

const Form = ({
    isLoading,
    roleDetails,
    roleId,
    spaceId,
}: {
    isLoading: boolean
    roleDetails: RoleDetails | null | undefined
    roleId: number
    spaceId: string
}) => {
    const [searchParams] = useSearchParams()
    const [channelFormId] = useState(() => searchParams.get('channelFormId'))

    return (
        <>
            <Stack scroll>
                {channelFormId ? (
                    <NewChannelPermissionOverridesMemoryForm
                        spaceId={spaceId}
                        roleId={roleId}
                        channelFormId={channelFormId}
                        roleDetails={roleDetails}
                        isLoading={isLoading}
                    />
                ) : (
                    <UpdateExistingChannelPermissionsForm
                        spaceId={spaceId}
                        roleId={roleId}
                        roleDetails={roleDetails}
                        isLoading={isLoading}
                    />
                )}
            </Stack>
            <UserOpTxModal />
        </>
    )
}

type Props = {
    spaceId: string
    roleId: number
    roleDetails: RoleDetails | null | undefined
    isLoading?: boolean
}

const UpdateExistingChannelPermissionsForm = (props: Props) => {
    const { spaceId, roleId, roleDetails } = props

    const channelId = useChannelId()

    const { isLoading, permissions: permissionOverrides } = usePermissionOverrides(
        spaceId,
        channelId,
        roleId,
    )

    const defaultPermissions = useMemo(
        () => (!permissionOverrides ? roleDetails?.permissions : permissionOverrides) ?? [],
        [permissionOverrides, roleDetails?.permissions],
    )

    const hasChanges = Array.isArray(permissionOverrides)

    const { clearPermissionOverrides } = useClearPermissionOverrides(spaceId, roleId, channelId)

    const onClearPermissions = useEvent(() => {
        clearPermissionOverrides()
    })

    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const { setChannelPermissionOverridesTransaction } = useSetChannelPermissionOverrides()

    const onSubmit = useEvent(async (permissions: Permission[]) => {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        await setChannelPermissionOverridesTransaction(
            spaceId,
            channelId,
            roleId,
            permissions,
            signer,
        )
    })

    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.SetChannelPermissionOverrides,
        BlockchainTransactionType.ClearChannelPermissionOverrides,
    )

    return (
        <PermissionForm
            type="updatePermissions"
            spaceId={spaceId}
            roleId={roleId}
            channelId={channelId}
            isLoading={props.isLoading || isLoading}
            roleDetails={roleDetails}
            permissionOverrides={permissionOverrides}
            defaultPermissions={defaultPermissions}
            hasChanges={hasChanges}
            isDisabled={!isPrivyReady || transactionIsPending}
            onClearPermissions={onClearPermissions}
            onSubmit={onSubmit}
        />
    )
}

const NewChannelPermissionOverridesMemoryForm = (props: Props & { channelFormId: string }) => {
    const { spaceId, channelFormId, roleId, roleDetails } = props

    const rolePermissions = roleDetails?.permissions

    const permissionOverrides = useChangePermissionOverridesStore(
        (state) => state.channels[channelFormId]?.roles[roleId]?.permissions,
    )

    const defaultPermissions = useChangePermissionOverridesStore(
        (state) => permissionOverrides ?? rolePermissions ?? [],
    )

    const hasChanges =
        !!permissionOverrides && !isEqual(rolePermissions?.sort(), permissionOverrides?.sort())

    const setPermissionOverrides = useChangePermissionOverridesStore(
        (state) => state.setPermissionOverrides,
    )

    const onClearPermissions = useEvent(() => {
        setPermissionOverrides(channelFormId, roleId, undefined)
    })

    const { closePanel } = usePanelActions()

    const onSubmit = useEvent((permissions: Permission[]) => {
        setPermissionOverrides(channelFormId, roleId, permissions)
        closePanel()
    })

    return (
        <PermissionForm
            type="createChannel"
            spaceId={spaceId}
            roleId={roleId}
            channelFormId={channelFormId}
            roleDetails={roleDetails}
            isLoading={false}
            permissionOverrides={undefined}
            defaultPermissions={defaultPermissions}
            hasChanges={hasChanges}
            onClearPermissions={onClearPermissions}
            onSubmit={onSubmit}
        />
    )
}

const PermissionForm = React.memo(
    (
        props: Props & {
            defaultPermissions: Permission[]
            hasChanges: boolean
            permissionOverrides: Permission[] | null | undefined
            onClearPermissions: () => void
            onSubmit: (permissions: Permission[]) => void
            isDisabled?: boolean
        } & (
                | {
                      type: 'createChannel'
                      channelFormId: string
                  }
                | {
                      type: 'updatePermissions'
                      channelId: string
                  }
            ),
    ) => {
        const {
            defaultPermissions,
            hasChanges,
            isDisabled = false,
            isLoading,
            onClearPermissions,
            onSubmit,
            roleDetails,
        } = props

        return (
            !isLoading && (
                <>
                    <FormRender
                        schema={formSchema}
                        id="PermissionRoleForm"
                        mode="onChange"
                        height="100%"
                        key={defaultPermissions.join()}
                        defaultValues={{
                            channelPermissions: defaultPermissions,
                        }}
                    >
                        {(hookForm) => {
                            const _form =
                                hookForm as unknown as UseFormReturn<RoleOverrideFormSchemaType>
                            return (
                                <FormProvider {..._form}>
                                    <Stack gap="lg" paddingY="sm">
                                        {!hasChanges ? (
                                            <DefaultDisclaimer roleName={roleDetails?.name} />
                                        ) : (
                                            <OverridesDisclaimer roleName={roleDetails?.name} />
                                        )}
                                        <Stack gap>
                                            <Stack
                                                horizontal
                                                justifyContent="spaceBetween"
                                                alignItems="end"
                                            >
                                                <Text>Channel permissions</Text>
                                                {hasChanges && (
                                                    <TextButton
                                                        color="cta2"
                                                        onClick={onClearPermissions}
                                                    >
                                                        Reset to default
                                                    </TextButton>
                                                )}
                                            </Stack>

                                            <Stack
                                                gap
                                                background="level2"
                                                rounded="sm"
                                                padding="md"
                                            >
                                                <ChannelPermissionsToggles
                                                    roleDetails={roleDetails}
                                                />
                                            </Stack>
                                        </Stack>

                                        <SubmitButton
                                            permissions={_form.watch('channelPermissions')}
                                            isDisabled={isDisabled}
                                            onSubmit={onSubmit}
                                        >
                                            Save
                                        </SubmitButton>
                                    </Stack>
                                </FormProvider>
                            )
                        }}
                    </FormRender>
                </>
            )
        )
    },
)

const DefaultDisclaimer = (props: { roleName?: string }) => (
    <Stack horizontal gap background="level2" padding="md" rounded="sm" alignItems="center">
        <Box>
            <Icon type="info" color="gray2" size="square_sm" />
        </Box>
        <Paragraph color="default">
            Changing these permissions will override the default channel permissions for the{' '}
            <span className={atoms({ color: 'default', fontWeight: 'strong' })}>
                {props.roleName}
            </span>{' '}
            role in this new channel.
        </Paragraph>
    </Stack>
)

const OverridesDisclaimer = (props: { roleName?: string }) => (
    <Stack horizontal gap background="level2" padding="md" rounded="sm" alignItems="center">
        <Box>
            <Icon type="info" color="gray2" size="square_sm" />
        </Box>
        <Paragraph color="default">
            These permissions overrides the default channel permissions for the{' '}
            <span className={atoms({ color: 'default', fontWeight: 'strong' })}>
                {props.roleName ?? ''}
            </span>{' '}
            role in this new channel.
        </Paragraph>
    </Stack>
)

const SubmitButton = (props: {
    children?: string
    permissions?: Permission[]
    isDisabled: boolean
    onSubmit: (permissions: Permission[]) => void
}) => {
    const { children, onSubmit, permissions } = props
    const { handleSubmit, formState, watch } = useFormContext<RoleOverrideFormSchemaType>()
    const { defaultValues } = formState
    const watchAllFields = watch()

    const isUnchanged = useMemo(() => {
        const def = structuredClone(defaultValues)
        const cur = structuredClone(watchAllFields)
        function sorter(arr: typeof defaultValues | undefined) {
            arr?.channelPermissions?.sort()
        }
        sorter(def)
        sorter(cur)

        return isEqual(def, cur)
    }, [defaultValues, watchAllFields])

    const isDisabled =
        props.isDisabled ||
        formState.isSubmitting ||
        isUnchanged ||
        Object.keys(formState.errors).length > 0

    const onValid = useEvent(async (data: RoleOverrideFormSchemaType) => {
        const _channelPermissions = [...new Set(data.channelPermissions)].sort()
        if (!permissions) {
            throw new Error('Missing required data')
        }
        onSubmit([..._channelPermissions])
    })

    const onInvalid: SubmitErrorHandler<RoleOverrideFormSchemaType> = useEvent((errors) => {
        console.log(errors)
    })

    return (
        <>
            <FancyButton
                cta
                data-testid="submit-button"
                disabled={isDisabled}
                onClick={handleSubmit(onValid, onInvalid)}
            >
                {children}
            </FancyButton>
        </>
    )
}

const useClearPermissionOverrides = (spaceId: string, roleId: number, channelId: string) => {
    const { clearChannelPermissionOverridesTransaction } = useClearChannelPermissionOverrides()
    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()

    const isDisabled = !isPrivyReady

    const clearPermissionOverrides = useEvent(async () => {
        const signer = await getSigner()

        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }

        if (!spaceId || roleId === undefined || !channelId) {
            throw new Error('Missing required data')
        }
        try {
            await clearChannelPermissionOverridesTransaction(spaceId, channelId, roleId, signer)
        } catch (e) {
            console.error(e)
        }
    })

    return {
        clearPermissionOverrides,
        isDisabled,
    }
}
