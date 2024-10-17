import React, { useMemo } from 'react'
import { SubmitErrorHandler, useFormContext } from 'react-hook-form'
import { useCreateRoleTransaction, useUpdateRoleTransaction } from 'use-towns-client'
import { isEqual } from 'lodash'
import { useGetEmbeddedSigner } from '@towns/privy'
import { useEvent } from 'react-use-event-hook'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { FancyButton } from '@ui'
import { prepareGatedDataForSubmit } from '@components/Tokens/utils'
import { Analytics } from 'hooks/useAnalytics'
import { RoleFormSchemaType } from '../Web3/CreateSpaceForm/types'

export function SingleRolePanelSubmitButton({
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
            arr?.tokensGatedBy?.sort()
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
            watchAllFields.tokensGatedBy.length === 0 &&
            watchAllFields.usersGatedBy.length === 0 &&
            !watchAllFields.ethBalanceGatedBy) ||
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

        Analytics.getInstance().track(
            isCreateRole ? 'clicked on create role' : 'clicked on save role',
            {
                spaceId,
            },
        )

        // just in case
        const _channelPermissions = [...new Set(data.channelPermissions)].sort()
        const _townPermissions = [...new Set(data.townPermissions)].sort()

        const { usersGatedBy, ruleData } = prepareGatedDataForSubmit(
            data.gatingType,
            data.tokensGatedBy,
            data.usersGatedBy,
            data.ethBalanceGatedBy,
        )

        const permissions = [..._channelPermissions, ..._townPermissions]
        if (isCreateRole) {
            console.log('[analytics]', ruleData)
            Analytics.getInstance().track('submitting create role transaction', {
                spaceId,
                gatingType: data.gatingType,
                userGated: data.usersGatedBy.length > 0,
                tokenGated: data.tokensGatedBy.length > 0,
                permissions,
            })
            const tx = await createRoleTransaction(
                spaceId,
                data.name,
                permissions,
                usersGatedBy,
                ruleData,
                signer,
            )
            const rx = await tx?.receipt
            if (rx?.status === 1) {
                Analytics.getInstance().track('successfully created role', {
                    spaceId,
                    gatingType: data.gatingType,
                    userGated: data.usersGatedBy.length > 0,
                    tokenGated: data.tokensGatedBy.length > 0,
                    permissions,
                })
            } else {
                Analytics.getInstance().track('failed to create role', {
                    spaceId,
                    gatingType: data.gatingType,
                    userGated: data.usersGatedBy.length > 0,
                    tokenGated: data.tokensGatedBy.length > 0,
                    permissions,
                })
            }
        } else {
            if (!roleId) {
                console.error('No roleId for edit role.')
                return
            }
            Analytics.getInstance().track('submitting save role transaction', {
                spaceId,
                gatingType: data.gatingType,
                userGated: data.usersGatedBy.length > 0,
                tokenGated: data.tokensGatedBy.length > 0,
                permissions,
            })
            const tx = await updateRoleTransaction(
                spaceId,
                roleId,
                data.name,
                permissions,
                usersGatedBy,
                ruleData,
                signer,
            )
            const rx = await tx?.receipt
            if (rx?.status === 1) {
                Analytics.getInstance().track('successfully saved role', {
                    spaceId,
                    gatingType: data.gatingType,
                    userGated: data.usersGatedBy.length > 0,
                    tokenGated: data.tokensGatedBy.length > 0,
                    permissions,
                })
            } else {
                Analytics.getInstance().track('failed to save role', {
                    spaceId,
                    gatingType: data.gatingType,
                    userGated: data.usersGatedBy.length > 0,
                    tokenGated: data.tokensGatedBy.length > 0,
                    permissions,
                })
            }
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
