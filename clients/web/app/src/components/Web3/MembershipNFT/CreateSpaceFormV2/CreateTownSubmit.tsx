import { UseFormReturn } from 'react-hook-form'
import { MembershipStruct, NoopRuleData, Permission, createOperationsTree } from '@river/web3'
import { CreateSpaceInfo, useCreateSpaceTransaction, useTownsClient } from 'use-towns-client'
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
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { convertTokenTypeToOperationType } from '@components/Tokens/utils'
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
    const { spaceDapp } = useTownsClient()

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
            if (!data?.spaceId) {
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(data.spaceId)
            toast.custom(
                (t) => (
                    <FailedUploadAfterSpaceCreation
                        toast={t}
                        spaceId={data.spaceId}
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
            if (!data?.spaceId) {
                return
            }
            const { removeLoadedResource } = useImageStore.getState()
            removeLoadedResource(data.spaceId)
            toast.custom(
                (t) => (
                    <FailedUploadAfterSpaceCreation
                        toast={t}
                        spaceId={data.spaceId}
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
                    createPrivyNotAuthenticatedNotification()
                    return
                }

                let priceInWei: ethers.BigNumberish

                try {
                    priceInWei = ethers.utils.parseEther(membershipCost)
                } catch (error) {
                    form.setError('membershipCost', {
                        type: 'manual',
                        message: 'Please enter a valid eth value.',
                    })
                    return
                }

                const requirements: MembershipStruct = {
                    settings: {
                        name: 'Member',
                        symbol: 'MEMBER',
                        price: priceInWei,
                        maxSupply: membershipLimit,
                        duration: 0,
                        currency: ethers.constants.AddressZero,
                        feeRecipient: await signer.getAddress(),
                        freeAllocation: 0,
                        pricingModule: ethers.constants.AddressZero,
                    },
                    requirements: {
                        // TODO: make sure token gating works after xchain updated
                        everyone: tokensGatingMembership.length === 0,
                        users: [],
                        ruleData:
                            tokensGatingMembership.length === 0
                                ? NoopRuleData
                                : createOperationsTree(
                                      tokensGatingMembership.map((t) => ({
                                          address: t.address as Address,
                                          chainId: BigInt(t.chainId),
                                          type: convertTokenTypeToOperationType(t.type),
                                      })),
                                  ),
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
                const errorMessage = result?.error && mapToErrorMessage(result.error)
                if (errorMessage) {
                    toast.custom(
                        (t) => (
                            <TransactionErrorNotification toast={t} errorMessage={errorMessage} />
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
                    const newPath = `/${PATHS.SPACES}/${result?.data.spaceId}/${PATHS.GETTING_STARTED}`
                    const networkId = result.data.spaceId

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
                        innerRoomId: networkId,
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
            <UserOpTxModal />
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
