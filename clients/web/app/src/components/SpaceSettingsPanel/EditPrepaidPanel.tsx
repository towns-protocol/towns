import React from 'react'
import { z } from 'zod'
import { FormProvider, UseFormReturn } from 'react-hook-form'
import {
    BlockchainTransactionType,
    useIsTransactionPending,
    usePrepaidSupply,
    usePrepayMembershipTransaction,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Button, ErrorMessage, FormRender, Icon, Paragraph, Stack, Text, TextField } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'

const prepaidSchema = z.object({
    supply: z.coerce
        .number({
            invalid_type_error: 'Please enter a number',
        })
        .positive(),
})

type PrepaidSchemaType = z.infer<typeof prepaidSchema>

export function EditPrepaidPanel() {
    return (
        <PrivyWrapper>
            <EditPrepaidPanelWithoutAuth />
        </PrivyWrapper>
    )
}

export function EditPrepaidPanelWithoutAuth() {
    const spaceId = useSpaceIdFromPathname()
    const { data: prepaidSupply, isLoading: isLoadingPrepaidSupply } = usePrepaidSupply(spaceId)
    const getSigner = useGetEmbeddedSigner()
    const isPendingTx = useIsTransactionPending(BlockchainTransactionType.PrepayMembership)
    const { prepayMembershipTransaction } = usePrepayMembershipTransaction()
    const onValid = useEvent(
        async (
            data: PrepaidSchemaType,
            form: UseFormReturn<{
                supply: number
            }>,
        ) => {
            const signer = await getSigner()
            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }
            if (!spaceId) {
                return
            }
            await prepayMembershipTransaction(spaceId, data.supply, signer)
            form.reset()
        },
    )

    return (
        <Stack gap height="100%">
            {isLoadingPrepaidSupply ? (
                <ButtonSpinner />
            ) : (
                <>
                    <Stack padding horizontal gap centerContent rounded="sm" background="level2">
                        <Icon type="info" shrink={false} size="square_sm" />
                        <Paragraph color="gray2">
                            This means membership fees will be waived for these members and you will
                            sponsor their River protocol fees and gas fees
                        </Paragraph>
                    </Stack>
                    <Stack grow>
                        <FormRender grow schema={prepaidSchema} id="prepaidForm" mode="onChange">
                            {(hookForm) => {
                                const _form =
                                    hookForm as unknown as UseFormReturn<PrepaidSchemaType>

                                const disabled =
                                    !!Object.keys(_form.formState.errors).length ||
                                    !_form.formState.isDirty ||
                                    isPendingTx

                                return (
                                    <FormProvider {..._form}>
                                        <Stack gap grow>
                                            <Stack padding gap rounded="sm" background="level2">
                                                <Stack
                                                    horizontal
                                                    alignItems="center"
                                                    justifyContent="spaceBetween"
                                                >
                                                    <Text>Available #</Text>
                                                    <Text>{prepaidSupply}</Text>
                                                </Stack>
                                                <Stack
                                                    horizontal
                                                    alignItems="center"
                                                    justifyContent="spaceBetween"
                                                >
                                                    <Stack grow>
                                                        <Text>Add more seats</Text>
                                                    </Stack>
                                                    <Stack width="100">
                                                        <TextField
                                                            data-testid="seats-input"
                                                            background="level3"
                                                            placeholder="Enter #"
                                                            renderLabel={(label) => (
                                                                <Text>{label}</Text>
                                                            )}
                                                            textAlign="right"
                                                            tone={
                                                                _form.formState.errors.supply
                                                                    ? 'error'
                                                                    : 'neutral'
                                                            }
                                                            {..._form.register('supply')}
                                                        />
                                                    </Stack>
                                                </Stack>
                                            </Stack>
                                            <Stack>
                                                {_form.formState.errors.supply && (
                                                    <ErrorMessage
                                                        errors={_form.formState.errors}
                                                        fieldName="supply"
                                                    />
                                                )}
                                            </Stack>
                                            <Button
                                                disabled={disabled}
                                                tone={disabled ? 'level2' : 'cta1'}
                                                style={{ marginTop: 'auto' }}
                                                onClick={_form.handleSubmit((d) =>
                                                    onValid(d, _form),
                                                )}
                                            >
                                                Update
                                            </Button>
                                        </Stack>
                                        <UserOpTxModal
                                            valueLabel={`Seats x ${_form.getValues('supply')}`}
                                        />
                                    </FormProvider>
                                )
                            }}
                        </FormRender>
                        {isPendingTx && <FullPanelOverlay text="" withSpinner={false} />}
                    </Stack>
                </>
            )}
        </Stack>
    )
}
