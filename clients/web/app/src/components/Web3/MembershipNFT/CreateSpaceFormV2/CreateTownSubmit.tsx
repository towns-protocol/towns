import * as Sentry from '@sentry/react'
import { UseFormReturn } from 'react-hook-form'
import {
    CreateSpaceInfo,
    Permission,
    RoomVisibility,
    useCreateSpaceTransaction,
    useWeb3Context,
    useZionClient,
} from 'use-zion-client'
import { useNavigate } from 'react-router'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import headlessToast, { Toast, toast } from 'react-hot-toast/headless'
import { Address } from 'wagmi'
import { Box, Icon, IconButton, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { toTransactionUIStates } from 'hooks/TransactionUIState'
import { BottomBar } from '../BottomBar'
import { PanelType, TransactionDetails } from './types'
import { CreateSpaceFormV2SchemaType } from './CreateSpaceFormV2.schema'
import { mapToErrorMessage } from './utils'

export function CreateTownSubmit({
    form,
    setPanelType,
    panelType,
    setTransactionDetails,
}: {
    form: UseFormReturn<CreateSpaceFormV2SchemaType>
    setPanelType: (panelType: PanelType | undefined) => void
    panelType: PanelType | undefined
    setTransactionDetails: ({ isTransacting }: TransactionDetails) => void
}) {
    const { signer } = useWeb3Context()
    const { spaceDapp } = useZionClient()

    const { data, isLoading, error, createSpaceTransactionWithRole, transactionStatus } =
        useCreateSpaceTransaction()
    const navigate = useNavigate()
    const transactionUIState = toTransactionUIStates(transactionStatus, Boolean(data))

    const hasError = useMemo(() => {
        return Boolean(error && error.name !== 'ACTION_REJECTED')
    }, [error])

    useEffect(() => {
        if (hasError) {
            Sentry.captureException(
                new Error(`Error creating town: ${error?.name} ${error?.message}`),
            )
        }
    }, [error, hasError])

    const onSubmit = useCallback(() => {
        toast.dismiss()
        setTransactionDetails({
            isTransacting: true,
            townAddress: undefined,
        })
        form.handleSubmit(
            async (values) => {
                const { spaceName, membershipCost, membershipLimit, tokensGatingMembership } =
                    values
                const createSpaceInfo: CreateSpaceInfo = {
                    name: spaceName,
                    visibility: RoomVisibility.Public,
                }
                if (!signer) {
                    console.error('Cannot create space. No signer.')
                    return undefined
                }

                const requirements = {
                    name: 'Member',
                    price: membershipCost,
                    limit: membershipLimit,
                    currency: ethers.constants.AddressZero,
                    feeRecipient: await signer.getAddress(),
                    permissions: [Permission.Read, Permission.Write],
                    requirements: {
                        everyone: tokensGatingMembership.length === 0,
                        tokens: tokensGatingMembership.map((token) => ({
                            contractAddress: token.contractAddress,
                            tokenIds: token.tokenIds,
                            quantity: 1,
                            isSingleToken: false,
                        })),
                        users: [],
                    },
                }
                console.log('submitting values: ', {
                    createSpaceInfo,
                    requirements,
                })

                // close the panel
                setPanelType(undefined)

                const result = await createSpaceTransactionWithRole(createSpaceInfo, requirements)
                if (result?.error) {
                    toast.custom(
                        (t) => (
                            <TransactionErrorNotification
                                toast={t}
                                errorMessage={mapToErrorMessage(result.error)}
                            />
                        ),
                        {
                            duration: Infinity,
                        },
                    )
                    setTransactionDetails({
                        isTransacting: false,
                        townAddress: undefined,
                    })
                    return
                }

                // TODO: upload image
                // TODO: upload town bio

                if (result?.data) {
                    const newPath = `/${PATHS.SPACES}/${result?.data.slug}/${PATHS.GETTING_STARTED}`
                    // try animating the token
                    try {
                        const spaceInfo = await spaceDapp?.getSpaceInfo(result.data.networkId)
                        setTransactionDetails({
                            isTransacting: true,
                            townAddress: spaceInfo?.address as Address,
                        })

                        setTimeout(() => {
                            navigate(newPath)
                        }, 3000)
                    } catch (error) {
                        // otherwise just navigate
                        navigate(newPath)
                    }
                }
            },
            (errors) => {
                if (errors.tokensGatingMembership) {
                    setPanelType(PanelType.gating)
                } else if (errors.membershipCost || errors.membershipLimit) {
                    setPanelType(PanelType.pricing)
                }
                setTransactionDetails({
                    isTransacting: false,
                    townAddress: undefined,
                })
            },
        )()
    }, [
        createSpaceTransactionWithRole,
        form,
        navigate,
        setPanelType,
        setTransactionDetails,
        signer,
        spaceDapp,
    ])

    return (
        <Stack horizontal centerContent>
            <BottomBar
                panelStatus={panelType ? 'open' : 'closed'}
                text="Create"
                disabled={isLoading || !form.formState.isValid}
                transactingText="Creating town"
                successText="Town created!"
                transactionUIState={transactionUIState}
                onClick={onSubmit}
            />
        </Stack>
    )
}

export const TransactionErrorNotification = ({
    toast,
    errorMessage,
}: {
    toast: Toast
    errorMessage: string
}) => {
    return (
        <Box horizontal gap width="300">
            <Icon color="error" type="alert" />
            <Box gap alignItems="end">
                <Text size="sm">{errorMessage}</Text>
            </Box>
            <IconButton icon="close" onClick={() => headlessToast.dismiss(toast.id)} />
        </Box>
    )
}
