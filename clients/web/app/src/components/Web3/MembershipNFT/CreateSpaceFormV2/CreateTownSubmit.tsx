import { UseFormReturn } from 'react-hook-form'
import {
    CreateSpaceInfo,
    Permission,
    makeRoomIdentifier,
    useCreateSpaceTransaction,
    useZionClient,
} from 'use-zion-client'
import { useNavigate } from 'react-router'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import headlessToast, { Toast, toast } from 'react-hot-toast/headless'
import { Address } from 'wagmi'
import { datadogRum } from '@datadog/browser-rum'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Box, Icon, IconButton, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { toTransactionUIStates } from 'hooks/TransactionUIState'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { useUploadImage } from 'api/lib/uploadImage'
import { useSetSpaceTopic } from 'hooks/useSpaceTopic'
import { FailedUploadAfterSpaceCreation } from '@components/Notifications/FailedUploadAfterSpaceCreation'
import { BottomBar } from '../BottomBar'
import { PanelType, TransactionDetails } from './types'
import { CreateSpaceFormV2SchemaType } from './CreateSpaceFormV2.schema'
import { mapToErrorMessage } from '../../utils'

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
    const getSigner = useGetEmbeddedSigner()
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
            datadogRum.addError(new Error(`Error creating town: ${error?.name} ${error?.message}`))
        }
    }, [error, hasError])

    const { mutate: uploadImage } = useUploadImage(undefined, {
        onError: () => {
            if (!data?.spaceId.networkId) {
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(data.spaceId.networkId)
            toast.custom(
                (t) => (
                    <FailedUploadAfterSpaceCreation
                        toast={t}
                        spaceId={data.spaceId.networkId}
                        message="There was an error uploading your town image."
                    />
                ),
                {
                    duration: 10_000,
                },
            )
        },
    })
    const { mutate: uploadSpaceBio } = useSetSpaceTopic(undefined, {
        onError: () => {
            if (!data?.spaceId.networkId) {
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(data.spaceId.networkId)
            toast.custom(
                (t) => (
                    <FailedUploadAfterSpaceCreation
                        toast={t}
                        spaceId={data.spaceId.networkId}
                        message="There was an error uploading your town bio."
                    />
                ),
                {
                    duration: 10_000,
                },
            )
        },
    })

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
                    name: spaceName ?? '',
                }
                const signer = await getSigner()
                if (!signer) {
                    console.error('Cannot create space. No signer.')
                    return undefined
                }

                const requirements = {
                    settings: {
                        name: 'Member',
                        symbol: 'MEMBER',
                        price: membershipCost,
                        maxSupply: membershipLimit,
                        duration: 0,
                        currency: ethers.constants.AddressZero,
                        feeRecipient: await signer.getAddress(),
                        freeAllocation: 0,
                        pricingModule: ethers.constants.AddressZero,
                    },
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
                    permissions: [Permission.Read, Permission.Write],
                }
                console.log('submitting values: ', {
                    createSpaceInfo,
                    requirements,
                })

                // close the panel
                setPanelType(undefined)

                const result = await createSpaceTransactionWithRole(
                    createSpaceInfo,
                    requirements,
                    signer,
                )
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

                // TODO: upload town bio

                if (result?.data) {
                    const newPath = `/${PATHS.SPACES}/${result?.data.spaceId.slug}/${PATHS.GETTING_STARTED}`
                    const networkId = result.data.spaceId.networkId

                    if (values.spaceIconUrl && values.spaceIconFile) {
                        const { setLoadedResource } = useImageStore.getState()
                        const { spaceIconUrl, spaceIconFile } = values
                        // set the image before upload so that it displays immediately
                        setLoadedResource(networkId, {
                            imageUrl: values.spaceIconUrl,
                        })

                        uploadImage({
                            id: networkId,
                            file: spaceIconFile,
                            imageUrl: spaceIconUrl,
                            type: 'spaceIcon',
                        })
                    }

                    // if there's no bio, just upload an empty string
                    const { spaceBio } = values
                    uploadSpaceBio({
                        description: spaceBio ?? '',
                        innerRoomId: makeRoomIdentifier(networkId),
                    })

                    let timeoutDuration = 0
                    try {
                        const spaceInfo = await spaceDapp?.getSpaceInfo(networkId)
                        setTransactionDetails({
                            isTransacting: true,
                            townAddress: spaceInfo?.address as Address,
                        })
                        timeoutDuration = 3000
                    } catch (error) {
                        console.log('error getting space info after creating town: ', error)
                    }

                    setTimeout(() => {
                        navigate(newPath)
                    }, timeoutDuration)
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
        getSigner,
        spaceDapp,
        uploadImage,
        uploadSpaceBio,
    ])

    return (
        <Stack horizontal centerContent>
            <BottomBar
                panelStatus={panelType ? 'open' : 'closed'}
                text="Create"
                disabled={isLoading || Object.keys(form.formState.errors).length > 0}
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
