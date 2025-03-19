import React, { useCallback, useEffect, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import {
    Permission,
    useChannelData,
    useHasPermission,
    useMyUserId,
    useSetChannelAutojoin,
    useSetHideUserJoinLeave,
} from 'use-towns-client'
import { z } from 'zod'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { Panel } from '@components/Panel/Panel'
import {
    ToggleAutojoin,
    ToggleHideUserJoinLeaveEvents,
} from '@components/Web3/CreateChannelForm/CreateChannelForm'
import { Box, Button, FormRender, Paragraph, Stack } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { mapToErrorMessage } from '@components/Web3/utils'
import { DeleteChannelButton } from './DeleteChannelButton'
export type FormState = z.infer<typeof schema>

export const schema = z.object({
    autojoin: z.boolean(),
    hideUserJoinLeaveEvents: z.boolean(),
})

const autojoinSuccessMessage = 'Auto-join settings updated'
const hideEventsSuccessMessage = 'Hide join/leave events settings updated'
const autojoinFailureMessage = 'Failed to update auto-join settings'
const hideEventsFailureMessage = 'Failed to update hide join/leave events settings'

export function ChannelRiverMetadataSettingsForm(): JSX.Element {
    const { channel, spaceId } = useChannelData()
    const { mutateAsync: setAutojoin, isPending: isPendingJoin } = useSetChannelAutojoin()
    const { mutateAsync: setHideUserJoinLeave, isPending: isPendingHide } =
        useSetHideUserJoinLeave()
    const isPending = isPendingJoin || isPendingHide

    const userId = useMyUserId()

    const { hasPermission: hasRemoveChannelPermission } = useHasPermission({
        permission: Permission.AddRemoveChannels,
        spaceId,
        walletAddress: userId,
    })

    const onSubmit = useCallback(
        async (changes: FormState) => {
            if (channel && spaceId) {
                const hasAutojoinChange = changes.autojoin !== channel.isAutojoin
                const hasHideUserJoinLeaveEventsChange =
                    changes.hideUserJoinLeaveEvents !== channel.hideUserJoinLeaveEvents
                const autojoin = () =>
                    setAutojoin({
                        spaceId,
                        channelId: channel.id,
                        autojoin: changes.autojoin,
                    })
                const hideUserJoinLeave = () =>
                    setHideUserJoinLeave({
                        spaceId,
                        channelId: channel.id,
                        hideEvents: changes.hideUserJoinLeaveEvents,
                    })

                let successMessage = ''
                let errorMessage = ''
                let errorSubMessage: string | undefined
                if (hasAutojoinChange && hasHideUserJoinLeaveEventsChange) {
                    const results = await Promise.allSettled([autojoin(), hideUserJoinLeave()])
                    if (results.every((r) => r.status === 'fulfilled')) {
                        successMessage = 'Channel settings updated'
                    } else if (results.every((r) => r.status === 'rejected')) {
                        errorMessage = 'Failed to update channel settings'
                        errorSubMessage = results
                            .map((r) =>
                                mapToErrorMessage({
                                    error: r.status === 'rejected' ? r.reason : undefined,
                                    source: 'channel settings both failed',
                                }),
                            )
                            .join(', ')
                    } else if (results[0].status === 'rejected') {
                        successMessage = hideEventsSuccessMessage
                        errorMessage = autojoinFailureMessage
                        errorSubMessage = mapToErrorMessage({
                            error: results[0].status === 'rejected' ? results[0].reason : undefined,
                            source: 'channel settings autojoin failed',
                        })
                    } else if (results[1].status === 'rejected') {
                        successMessage = autojoinSuccessMessage
                        errorMessage = hideEventsFailureMessage
                        errorSubMessage = mapToErrorMessage({
                            error: results[1].status === 'rejected' ? results[1].reason : undefined,
                            source: 'channel settings hide events failed',
                        })
                    }
                } else if (hasAutojoinChange) {
                    try {
                        await autojoin()
                        successMessage = autojoinSuccessMessage
                    } catch (error) {
                        errorMessage = autojoinFailureMessage
                        errorSubMessage = mapToErrorMessage({
                            error: error as Error,
                            source: 'channel settings autojoin failed',
                        })
                    }
                } else if (hasHideUserJoinLeaveEventsChange) {
                    try {
                        await hideUserJoinLeave()
                        successMessage = hideEventsSuccessMessage
                    } catch (error) {
                        errorMessage = hideEventsFailureMessage
                        errorSubMessage = mapToErrorMessage({
                            error: error as Error,
                            source: 'channel settings hide events failed',
                        })
                    }
                }

                if (successMessage) {
                    popupToast(({ toast }) => (
                        <StandardToast.Success message={successMessage} toast={toast} />
                    ))
                } else if (errorMessage) {
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            message={errorMessage}
                            subMessage={errorSubMessage}
                            toast={toast}
                        />
                    ))
                }
            }
        },
        [channel, setAutojoin, setHideUserJoinLeave, spaceId],
    )

    const defaultValues = useMemo(
        () => ({
            autojoin: channel?.isAutojoin,
            hideUserJoinLeaveEvents: channel?.hideUserJoinLeaveEvents,
        }),
        [channel?.isAutojoin, channel?.hideUserJoinLeaveEvents],
    )

    if (!channel) {
        return (
            <Stack minHeight="200">
                <Paragraph>Channel not found</Paragraph>
            </Stack>
        )
    }

    return (
        <Stack grow gap="lg">
            <FormRender<FormState>
                grow
                schema={schema}
                defaultValues={defaultValues}
                mode="onChange"
                onSubmit={onSubmit}
            >
                {({ formState, setValue, watch, reset }) => {
                    const isDisabled = !formState.isDirty || !formState.isValid || isPending
                    const autojoinValue = watch('autojoin')
                    const hideUserJoinLeaveEventsValue = watch('hideUserJoinLeaveEvents')

                    return (
                        <Stack grow>
                            <ResetForm
                                reset={reset}
                                formState={formState}
                                isAutojoin={channel.isAutojoin}
                                hideUserJoinLeaveEvents={channel.hideUserJoinLeaveEvents}
                            />
                            <Stack grow gap>
                                <Box gap padding rounded="sm" background="level2">
                                    <ToggleAutojoin
                                        value={autojoinValue}
                                        disabled={isPending}
                                        onToggle={() => {
                                            setValue('autojoin', !autojoinValue, {
                                                shouldValidate: true,
                                                shouldDirty: true,
                                            })
                                        }}
                                    />

                                    <ToggleHideUserJoinLeaveEvents
                                        value={hideUserJoinLeaveEventsValue}
                                        disabled={isPending}
                                        onToggle={() => {
                                            setValue(
                                                'hideUserJoinLeaveEvents',
                                                !hideUserJoinLeaveEventsValue,
                                                {
                                                    shouldValidate: true,
                                                    shouldDirty: true,
                                                },
                                            )
                                        }}
                                    />
                                </Box>
                                {spaceId && hasRemoveChannelPermission && !channel.disabled && (
                                    <DeleteChannelButton spaceId={spaceId} channelId={channel.id} />
                                )}
                            </Stack>

                            <Box gap="sm">
                                <Button
                                    type="submit"
                                    tone={isDisabled ? 'level2' : 'cta1'}
                                    disabled={isDisabled}
                                >
                                    {isPending && <ButtonSpinner />}
                                    Update
                                </Button>
                            </Box>
                        </Stack>
                    )
                }}
            </FormRender>
        </Stack>
    )
}

function ResetForm({
    formState,
    reset,
    hideUserJoinLeaveEvents,
    isAutojoin,
}: {
    hideUserJoinLeaveEvents: boolean | undefined
    isAutojoin: boolean | undefined
} & Pick<UseFormReturn<FormState>, 'formState' | 'reset'>) {
    useEffect(() => {
        if (formState.isSubmitSuccessful) {
            reset({
                autojoin: isAutojoin,
                hideUserJoinLeaveEvents,
            })
        }
    }, [
        formState.defaultValues,
        formState.isSubmitSuccessful,
        reset,
        hideUserJoinLeaveEvents,
        isAutojoin,
    ])
    return null
}

export const ChannelRiverMetadataSettingsPanel = React.memo(() => {
    return (
        <Panel label="Edit Channel Settings">
            <ChannelRiverMetadataSettingsForm />
        </Panel>
    )
})
