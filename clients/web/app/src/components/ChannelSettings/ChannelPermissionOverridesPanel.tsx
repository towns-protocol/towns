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
import { AnimatePresence } from 'framer-motion'
import { atoms } from 'ui/styles/atoms.css'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { Box, FancyButton, FormRender, Icon, Paragraph, Stack, Text, TextButton } from '@ui'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { ChannelPermissionsToggles } from '@components/SpaceSettingsPanel/SingleRolePanel'
import { Panel } from '@components/Panel/Panel'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { FadeIn } from '@components/Transitions'
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

    const rolePermissions = useMemo(
        () => roleDetails?.permissions ?? [],
        [roleDetails?.permissions],
    )

    const hasPendingTx = useIsTransactionPending(
        BlockchainTransactionType.SetChannelPermissionOverrides,
        BlockchainTransactionType.ClearChannelPermissionOverrides,
    )

    const [searchParams] = useSearchParams()
    const [channelFormId] = useState(() => searchParams.get('channelFormId'))

    return (
        <PrivyWrapper>
            <Panel label="Edit Channel Permissions">
                <Stack scroll>
                    {channelFormId ? (
                        <NewChannelPermissionOverridesMemoryForm
                            spaceId={spaceId}
                            roleId={roleId}
                            channelFormId={channelFormId}
                            roleDetails={roleDetails}
                            rolePermissions={rolePermissions}
                            isLoading={isLoading}
                        />
                    ) : (
                        <UpdateExistingChannelPermissionsForm
                            spaceId={spaceId}
                            roleId={roleId}
                            roleDetails={roleDetails}
                            rolePermissions={rolePermissions}
                            isLoading={isLoading}
                        />
                    )}
                </Stack>
                <UserOpTxModal />
                {(hasPendingTx || isLoading) && <FullPanelOverlay />}
            </Panel>
        </PrivyWrapper>
    )
})

type Props = {
    spaceId: string
    roleId: number
    roleDetails: RoleDetails | null | undefined
    rolePermissions: Permission[]
    isLoading?: boolean
}

const UpdateExistingChannelPermissionsForm = (props: Props) => {
    const { spaceId, roleId, roleDetails, rolePermissions } = props

    const channelId = useChannelId()

    const { isLoading, permissions: permissionOverrides } = usePermissionOverrides(
        spaceId,
        channelId,
        roleId,
    )

    const defaultPermissions = useMemo(
        () => (!permissionOverrides ? rolePermissions : permissionOverrides) ?? [],
        [permissionOverrides, rolePermissions],
    )

    const hasOverrides = Array.isArray(permissionOverrides)

    const { clearPermissionOverrides } = useClearPermissionOverrides(spaceId, roleId, channelId)

    const onClearPermissions = useEvent(() => {
        clearPermissionOverrides()
    })

    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()
    const { setChannelPermissionOverridesTransaction } = useSetChannelPermissionOverrides()
    const { clearChannelPermissionOverridesTransaction } = useClearChannelPermissionOverrides()

    const onSubmit = useEvent(async (permissions: Permission[]) => {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }

        const action =
            hasOverrides && isEqual(new Set(permissions), new Set(rolePermissions))
                ? 'clear'
                : 'set'

        if (action === 'clear') {
            await clearChannelPermissionOverridesTransaction(spaceId, channelId, roleId, signer)
        } else {
            await setChannelPermissionOverridesTransaction(
                spaceId,
                channelId,
                roleId,
                permissions,
                signer,
            )
        }
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
            rolePermissions={rolePermissions}
            defaultPermissions={defaultPermissions}
            defaultResetPermissions={rolePermissions}
            hasOverrides={hasOverrides}
            isDisabled={!isPrivyReady || transactionIsPending}
            onClearPermissions={onClearPermissions}
            onSubmit={onSubmit}
        />
    )
}

const NewChannelPermissionOverridesMemoryForm = (props: Props & { channelFormId: string }) => {
    const { spaceId, channelFormId, roleId, roleDetails, rolePermissions, isLoading } = props

    const permissionOverrides = useChangePermissionOverridesStore(
        (state) => state.channels[channelFormId]?.roles[roleId]?.permissions,
    )

    const defaultPermissions = useChangePermissionOverridesStore(
        (state) => permissionOverrides ?? rolePermissions ?? [],
    )

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
            isLoading={isLoading}
            hasOverrides={false}
            defaultPermissions={defaultPermissions}
            defaultResetPermissions={rolePermissions}
            rolePermissions={rolePermissions}
            onClearPermissions={onClearPermissions}
            onSubmit={onSubmit}
        />
    )
}

const PermissionForm = React.memo(
    (
        props: Props & {
            defaultPermissions: Permission[]
            hasOverrides: boolean
            defaultResetPermissions: Permission[]
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
            hasOverrides,
            isDisabled = false,
            isLoading,
            defaultResetPermissions,
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
                                        {!hasOverrides ? (
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

                                                <ResetPermissionsButton
                                                    defaultValues={defaultResetPermissions}
                                                />
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
                                            defaultValues={{
                                                channelPermissions: defaultPermissions,
                                            }}
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

const ResetPermissionsButton = (props: { defaultValues: Permission[] }) => {
    const { setValue, getValues } = useFormContext<RoleOverrideFormSchemaType>()

    const hasChanges = !isEqual(
        new Set(getValues().channelPermissions),
        new Set(props.defaultValues),
    )
    const onReset = useEvent(() => {
        setValue('channelPermissions', props.defaultValues)
    })

    return (
        <AnimatePresence>
            {hasChanges && (
                <FadeIn>
                    <TextButton color="cta2" onClick={onReset}>
                        Reset to default
                    </TextButton>
                </FadeIn>
            )}
        </AnimatePresence>
    )
}

const SubmitButton = (props: {
    children?: string
    permissions: Permission[]
    defaultValues: { channelPermissions: Permission[] }
    isDisabled: boolean
    onSubmit: (permissions: Permission[]) => void
}) => {
    const { children, onSubmit, permissions, defaultValues } = props
    const { handleSubmit, formState, watch } = useFormContext<RoleOverrideFormSchemaType>()
    const watchAllFields = watch()

    const isUnchanged = useMemo(() => {
        return isEqual(
            new Set(defaultValues?.channelPermissions),
            new Set(watchAllFields.channelPermissions),
        )
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
