import {
    BlockchainTransactionType,
    Permission,
    SignerUndefinedError,
    TransactionStatus,
    UpdateChannelInfo,
    WalletDoesNotMatchSignedInAccountError,
    useChannelId,
    useIsTransactionPending,
    useRoom,
    useSpaceId,
    useUpdateChannelTransaction,
} from 'use-towns-client'
import React, { useCallback, useMemo, useState } from 'react'
import { useGetEmbeddedSigner } from '@towns/privy'
import { z } from 'zod'
import { ChannelNameRegExp, isForbiddenError, isRejectionError } from 'ui/utils/utils'
import { Box, Button, ErrorMessage, FormRender, Paragraph, Stack, TextField } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { useAllRoleDetails } from 'hooks/useAllRoleDetails'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { mapToErrorMessage } from '@components/Web3/utils'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { Panel } from '@components/Panel/Panel'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { RoleCheckboxProps, RolesSection, getCheckedValuesForRoleIdsField } from './RolesSection'

export type FormState = z.infer<typeof schema>

export const schema = z.object({
    name: z.string().min(1, 'Please enter a channel name'),
    description: z.string().min(0, 'Please enter a description').optional(),
    roleIds: z.string().array().nonempty('Please select at least one role'),
})

type ChannelPermissionsNameDescriptionFormProps = {
    spaceId: string
    channelId: string
    editType: 'metadata' | 'roles' | 'all'
    onSuccess?: () => void
}

/**
 * This form is used in both a modal and a panel. Depending on the editType, it will render different fields.
 * There is only a single contract method to update the channel, which requires both metadata (name, description) and roles as parameters.
 * So that's why this is a single form that collects all this data as default values and sends it to the contract, even if the UI only shows a subset of the fields.
 */
export function ChannelPermissionsNameDescriptionForm({
    spaceId,
    channelId,
    editType,
    preventCloseMessage,
    onSuccess,
}: ChannelPermissionsNameDescriptionFormProps & {
    preventCloseMessage?: string
}): JSX.Element {
    const channel = useRoom(channelId)
    console.log('[ChannelPermissionsNameDescriptionModal] channel', channel)
    const { data, isLoading, invalidateQuery } = useAllRoleDetails(spaceId)

    const rolesWithDetails = useMemo((): RoleCheckboxProps[] | undefined => {
        if (isLoading) {
            return undefined
        }
        return data
            ?.filter((role) => role.permissions.includes(Permission.Read))
            .map((role) => {
                const channelHasRole = role.channels.some((c) => c.channelNetworkId === channelId)
                return {
                    ...role,
                    channelHasRole,
                    tokenAddresses: [], // TODO role.ruleData.map((token) => token.contractAddress as string),
                }
            })
    }, [data, channelId, isLoading])

    const {
        updateChannelTransaction,
        error: transactionError,
        transactionHash,
    } = useUpdateChannelTransaction()

    const channels = useSpaceChannels()
    const channelNames = useMemo(
        () => new Set(channels?.filter((c) => c.id !== channelId).map((c) => c.label) ?? []),
        [channels, channelId],
    )

    const hasPendingTx = useIsTransactionPending(BlockchainTransactionType.EditChannel)

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

    const { getSigner, isPrivyReady } = useGetEmbeddedSigner()

    const onSubmit = useCallback(
        async (changes: FormState) => {
            const signer = await getSigner()
            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            if (hasPendingTx) {
                return
            }

            const name = changes['name']
            const description = changes['description']
            const roleIds = changes['roleIds'].map((roleId) => Number(roleId))
            const channelInfo: UpdateChannelInfo = {
                parentSpaceId: spaceId,
                channelId,
                updatedChannelName: name,
                updatedChannelTopic: description,
                updatedRoleIds: roleIds.map((roleId) => Number(roleId)),
            }
            console.log('[ChannelPermissionsNameDescriptionModal] update channel', channelInfo)
            const txResult = await updateChannelTransaction(channelInfo, signer)
            console.log('[ChannelPermissionsNameDescriptionModal] txResult', txResult)
            if (txResult?.status === TransactionStatus.Success) {
                invalidateQuery()
                onSuccess?.()
            }
        },
        [
            getSigner,
            hasPendingTx,
            spaceId,
            channelId,
            updateChannelTransaction,
            invalidateQuery,
            onSuccess,
        ],
    )

    const onNameKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLInputElement>) => {
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

    const errorBox = useMemo(() => {
        let errMsg: string | undefined = undefined
        // TODO: refactor error handling to use Web3/utils.mapToErrorMessage
        // https://linear.app/hnt-labs/issue/HNT-4621/refactor-create-channel-and-edit-channel-error-reporting
        switch (true) {
            case transactionError instanceof SignerUndefinedError:
                errMsg = 'Wallet is not connected'
                break
            case transactionError instanceof WalletDoesNotMatchSignedInAccountError:
                errMsg = 'Current wallet is not the same as the signed in account'
                break
            case transactionError && hasServerError:
                if (transactionError && isForbiddenError(transactionError)) {
                    errMsg = "You don't have permission to update a channel in this town"
                } else {
                    errMsg = 'There was an error updating the channel'
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
        if (errMsg && mapToErrorMessage({ error: transactionError, source: 'edit channel' })) {
            return (
                <Box paddingBottom="sm" flexDirection="row" justifyContent="end">
                    <ErrorMessageText message={errMsg} />
                </Box>
            )
        }
        return null
    }, [hasServerError, hasTransactionError, transactionError])

    const channelNameAvailable = useCallback(
        (name: string) => {
            return !channelNames.has(name)
        },
        [channelNames],
    )

    if (!channel) {
        return (
            <Stack minHeight="200">
                <Paragraph>Channel not found</Paragraph>
            </Stack>
        )
    }

    if (!rolesWithDetails) {
        return (
            <Stack minHeight="200">
                <ButtonSpinner />
            </Stack>
        )
    }

    return (
        <Stack grow gap="lg">
            <FormRender<FormState>
                grow
                schema={schema}
                defaultValues={{
                    name: channel.name,
                    description: channel.topic,
                    roleIds: getCheckedValuesForRoleIdsField(rolesWithDetails),
                }}
                mode="onChange"
                onSubmit={onSubmit}
            >
                {({ register, formState, setValue, setError, resetField, watch }) => {
                    const { onChange: onNameChange, ...restOfNameProps } = register('name')
                    const isDisabled =
                        !isPrivyReady || hasPendingTx || !formState.isDirty || !formState.isValid
                    watch()

                    return (
                        <Stack grow>
                            {(editType === 'metadata' || editType === 'all') && (
                                <>
                                    <Stack>
                                        <TextField
                                            autoFocus
                                            background="level2"
                                            label="Name"
                                            placeholder="Name your channel"
                                            maxLength={30}
                                            message={
                                                <ErrorMessage<FormState>
                                                    errors={formState.errors}
                                                    fieldName="name"
                                                />
                                            }
                                            disabled={hasPendingTx}
                                            onKeyDown={onNameKeyDown}
                                            onChange={(
                                                event: React.ChangeEvent<HTMLInputElement>,
                                            ) => {
                                                const name = event.target.value
                                                    .toLowerCase()
                                                    .replaceAll(' ', '-')
                                                if (!channelNameAvailable(name)) {
                                                    setError('name', {
                                                        message:
                                                            'This channel name is already taken',
                                                    })
                                                    return
                                                }
                                                onNameChange(event)
                                                setValue('name', name)
                                            }}
                                            {...restOfNameProps}
                                        />
                                    </Stack>

                                    <Stack paddingTop="sm">
                                        <TextField
                                            background="level2"
                                            label="Description"
                                            placeholder="Describe what this channel is about"
                                            maxLength={255}
                                            message={
                                                <ErrorMessage<FormState>
                                                    errors={formState.errors}
                                                    fieldName="description"
                                                />
                                            }
                                            disabled={hasPendingTx}
                                            {...register('description')}
                                        />
                                    </Stack>
                                </>
                            )}

                            {(editType === 'roles' || editType === 'all') && (
                                <Stack grow gap="sm">
                                    <RolesSection
                                        rolesWithDetails={rolesWithDetails}
                                        resetField={resetField}
                                        spaceId={spaceId}
                                        register={register}
                                        fieldName="roleIds"
                                    />

                                    <ErrorMessage<FormState>
                                        errors={formState.errors}
                                        fieldName="roleIds"
                                    />

                                    {errorBox}
                                </Stack>
                            )}

                            {preventCloseMessage && (
                                <Box centerContent paddingY="md">
                                    <ErrorMessageText
                                        color="negative"
                                        message={preventCloseMessage}
                                    />
                                </Box>
                            )}
                            <Box gap="sm">
                                <Button
                                    type="submit"
                                    tone={isDisabled ? 'level2' : 'cta1'}
                                    disabled={isDisabled}
                                >
                                    {hasPendingTx ? 'Saving' : 'Save Channel'}
                                    {hasPendingTx && <ButtonSpinner />}
                                </Button>
                            </Box>
                        </Stack>
                    )
                }}
            </FormRender>
        </Stack>
    )
}

export const ChannelPermissionsNameDescriptionPanel = React.memo(() => {
    const { openPanel } = usePanelActions()
    const hasPendingTx = useIsTransactionPending(BlockchainTransactionType.EditChannel)

    return (
        <PrivyWrapper>
            <Panel label="Edit Channel Permissions">
                <Form
                    editType="roles"
                    onSuccess={() => openPanel(CHANNEL_INFO_PARAMS.CHANNEL_INFO)}
                />
                {hasPendingTx && <FullPanelOverlay />}
            </Panel>
        </PrivyWrapper>
    )
})

const Form = ({
    transactionMessage,
    editType,
    onSuccess,
}: {
    transactionMessage?: string
    editType: 'roles' | 'metadata'
    onSuccess?: () => void
}) => {
    const spaceId = useSpaceId()
    const channelId = useChannelId()

    return spaceId && channelId ? (
        <>
            <Stack grow>
                <ChannelPermissionsNameDescriptionForm
                    editType={editType}
                    spaceId={spaceId}
                    preventCloseMessage={transactionMessage}
                    channelId={channelId}
                    onSuccess={onSuccess}
                />
            </Stack>
            <UserOpTxModal />
        </>
    ) : (
        <></>
    )
}

export const ChannelPermissionsNameDescriptionModal = ({ onHide }: { onHide: () => void }) => {
    const [transactionMessage, setTransactionMessage] = useState<string | undefined>()
    const hasPendingTx = useIsTransactionPending(BlockchainTransactionType.EditChannel)

    const _onHide = useCallback(() => {
        if (hasPendingTx) {
            setTransactionMessage('Please wait for the transaction to complete.')
            return
        }
        onHide()
    }, [hasPendingTx, onHide])

    return (
        <ModalContainer onHide={_onHide}>
            <Form transactionMessage={transactionMessage} editType="metadata" onSuccess={_onHide} />
        </ModalContainer>
    )
}
