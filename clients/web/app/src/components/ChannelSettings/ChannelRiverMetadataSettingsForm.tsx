import { useChannelData, useSetChannelAutojoin, useSetHideUserJoinLeave } from 'use-towns-client'
import React, { useCallback, useEffect, useMemo } from 'react'
import { z } from 'zod'
import { UseFormReturn } from 'react-hook-form'
import { Box, Button, FormRender, Paragraph, Stack } from '@ui'
import { Panel } from '@components/Panel/Panel'
import {
    ToggleAutojoin,
    ToggleHideUserJoinLeaveEvents,
} from '@components/Web3/CreateChannelForm/CreateChannelForm'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

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
                if (hasAutojoinChange && hasHideUserJoinLeaveEventsChange) {
                    const results = await Promise.allSettled([autojoin(), hideUserJoinLeave()])
                    if (results.every((r) => r.status === 'fulfilled')) {
                        successMessage = 'Channel settings updated'
                    } else if (results.every((r) => r.status === 'rejected')) {
                        errorMessage = 'Failed to update channel settings'
                    } else if (results[0].status === 'rejected') {
                        successMessage = hideEventsSuccessMessage
                        errorMessage = autojoinFailureMessage
                    } else if (results[1].status === 'rejected') {
                        successMessage = autojoinSuccessMessage
                        errorMessage = hideEventsFailureMessage
                    }
                } else if (hasAutojoinChange) {
                    try {
                        await autojoin()
                        successMessage = autojoinSuccessMessage
                    } catch (error) {
                        errorMessage = autojoinFailureMessage
                    }
                } else if (hasHideUserJoinLeaveEventsChange) {
                    try {
                        await hideUserJoinLeave()
                        successMessage = hideEventsSuccessMessage
                    } catch (error) {
                        errorMessage = hideEventsFailureMessage
                    }
                }

                if (successMessage) {
                    popupToast(({ toast }) => (
                        <StandardToast.Success message={successMessage} toast={toast} />
                    ))
                } else if (errorMessage) {
                    popupToast(({ toast }) => (
                        <StandardToast.Error message={errorMessage} toast={toast} />
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
                            <Stack grow gap="sm">
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
