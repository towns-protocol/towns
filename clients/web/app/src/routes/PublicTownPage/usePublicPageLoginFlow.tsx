import React, { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { TSigner, useMyDefaultUsernames, useTownsClient, useTownsContext } from 'use-towns-client'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useStore } from 'store/store'
import { mapToErrorMessage } from '@components/Web3/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'

const JOIN = 'join'
const PRIVY_OAUTH_STATE = 'privy_oauth_state'

type TClientSingleton = ReturnType<typeof useTownsClient>['clientSingleton']
type TSignerContext = ReturnType<typeof useTownsContext>['signerContext']

export function usePublicPageLoginFlow() {
    const { setRecentlyMintedSpaceToken } = useStore()
    const spaceId = useSpaceIdFromPathname()
    const { joiningTown, joinedTown } = useJoinFunnelAnalytics()
    const { gatedSpace, priceInWei, pricingModule, tokensGatedBy } = useGatherSpaceDetailsAnalytics(
        { spaceId },
    )
    const {
        spaceBeingJoined,
        setSpaceBeingJoined,
        setJoinStep,
        joinStep,
        end,
        disableJoinUi,
        setDisableJoinUi,
        assetModal,
        setAssetModal,
    } = publicPageLoginStore(
        useShallow((s) => ({
            assetModal: s.assetModal,
            disableJoinUi: s.disableJoinUi,
            setDisableJoinUi: s.setDisableJoinUi,
            setAssetModal: s.setAssetModal,
            spaceBeingJoined: s.spaceBeingJoined,
            joinStep: s.joinStep,
            setSpaceBeingJoined: s.setSpaceBeingJoined,
            setJoinStep: s.setJoinStep,
            end: s.end,
        })),
    )

    const defaultUsername = useMyDefaultUsernames()?.at(0)

    const joinTown = useCallback(
        async ({
            signer,
            clientSingleton,
            signerContext,
            source,
            analyticsData,
        }: {
            signer: TSigner
            clientSingleton: TClientSingleton
            signerContext: TSignerContext
            source: string
            analyticsData: {
                spaceName: string | undefined
            }
        }) => {
            if (!spaceId || !clientSingleton || !signer || !signerContext) {
                const missingParams: string[] = []
                if (!spaceId) {
                    missingParams.push('spaceId')
                }
                if (!clientSingleton) {
                    missingParams.push('clientSingleton')
                }
                if (!signer) {
                    missingParams.push('signer')
                }
                if (!signerContext) {
                    missingParams.push('signerContext')
                }
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="There was an error joining the town."
                        subMessage={mapToErrorMessage({
                            error: new Error(
                                `[usePublicPageLoginFlow] missing params: ${missingParams.join(
                                    ', ',
                                )} - ${source}`,
                            ),
                            source,
                        })}
                    />
                ))
                end()
                return
            }

            joiningTown({ spaceId, spaceName: analyticsData.spaceName })

            try {
                const result = await clientSingleton.joinTown(
                    spaceId,
                    signer,
                    signerContext,
                    (status) => {
                        if (status === 'membership-minted') {
                            setRecentlyMintedSpaceToken({ spaceId: spaceId, isOwner: false })
                        }
                    },
                    defaultUsername,
                )

                if (result) {
                    joinedTown({
                        spaceId,
                        spaceName: analyticsData.spaceName,
                        gatedSpace,
                        pricingModule,
                        priceInWei,
                        tokensGatedBy,
                    })
                } else {
                    end()
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            toast={toast}
                            message="There was an error joining the town."
                            subMessage={mapToErrorMessage({
                                error: new Error('unable to join space unknown'),
                                source: 'join space',
                            })}
                        />
                    ))
                }
            } catch (error) {
                end()
                const _error = error as Error

                const errorMessage = mapToErrorMessage({ error: _error, source: 'join space' })

                if (errorMessage === 'ACTION_REJECTED') {
                    return
                }

                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="There was an error joining the town."
                        subMessage={errorMessage}
                    />
                ))
            }
        },
        [
            spaceId,
            joiningTown,
            end,
            defaultUsername,
            setRecentlyMintedSpaceToken,
            joinedTown,
            gatedSpace,
            pricingModule,
            priceInWei,
            tokensGatedBy,
        ],
    )

    const startJoinDoesNotMeetRequirements = useCallback(() => {
        if (!spaceId) {
            return
        }
        setAssetModal(true)
        setSpaceBeingJoined(spaceId)
        setRecentlyMintedSpaceToken(undefined)
    }, [spaceId, setSpaceBeingJoined, setRecentlyMintedSpaceToken, setAssetModal])

    const startJoinMeetsRequirements = useCallback(
        async ({
            signer,
            clientSingleton,
            signerContext,
            source,
            analyticsData,
        }: {
            signer: TSigner
            clientSingleton: TClientSingleton
            signerContext: TSignerContext
            source: string
            analyticsData: {
                spaceName: string
            }
        }) => {
            if (!spaceId) {
                return
            }
            if (disableJoinUi) {
                return
            }

            if (clientSingleton && spaceId && signer) {
                setDisableJoinUi(true)
                setSpaceBeingJoined(spaceId)
                setRecentlyMintedSpaceToken(undefined)
                await joinTown({
                    signer,
                    clientSingleton,
                    signerContext,
                    source,
                    analyticsData,
                })
                setDisableJoinUi(false)
            }
        },
        [
            spaceId,
            disableJoinUi,
            setDisableJoinUi,
            setSpaceBeingJoined,
            setRecentlyMintedSpaceToken,
            joinTown,
        ],
    )

    const startJoinPreLogin = useCallback(() => {
        if (!spaceId || spaceBeingJoined) {
            return
        }
        setSpaceBeingJoined(spaceId)
    }, [spaceBeingJoined, setSpaceBeingJoined, spaceId])

    const joinAfterSuccessfulCrossmint = useCallback(
        async ({
            clientSingleton,
            signerContext,
            analyticsData,
        }: {
            clientSingleton: TClientSingleton
            signerContext: TSignerContext
            analyticsData: {
                spaceName: string
            }
        }) => {
            if (!spaceId || !clientSingleton || !signerContext) {
                const missingParams: string[] = []
                if (!spaceId) {
                    missingParams.push('spaceId')
                }
                if (!clientSingleton) {
                    missingParams.push('clientSingleton')
                }
                if (!signerContext) {
                    missingParams.push('signerContext')
                }
                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="There was an error joining the town."
                        subMessage={mapToErrorMessage({
                            error: new Error(
                                `[usePublicPageLoginFlow] missing params: ${missingParams.join(
                                    ', ',
                                )} - crossmintSuccess`,
                            ),
                            source: 'crossmintSuccess',
                        })}
                    />
                ))
                end()
                return
            }
            joiningTown({ spaceId, spaceName: analyticsData.spaceName })

            try {
                const result = await clientSingleton?.joinRiverSpaceAndDefaultChannels(
                    spaceId,
                    signerContext,
                    (update) => {
                        console.log('[joinTown] join flow status', update)
                    },
                    undefined,
                )

                if (result) {
                    joinedTown({
                        spaceId,
                        spaceName: analyticsData.spaceName,
                        gatedSpace,
                        pricingModule,
                        priceInWei,
                        tokensGatedBy,
                    })
                } else {
                    end()
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            toast={toast}
                            message="There was an error joining the town."
                            subMessage={mapToErrorMessage({
                                error: new Error('unable to join space unknown'),
                                source: 'join space',
                            })}
                        />
                    ))
                }
            } catch (error) {
                end()
                const _error = error as Error

                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message="There was an error joining the town."
                        subMessage={mapToErrorMessage({ error: _error, source: 'join space' })}
                    />
                ))
            }
        },
        [
            end,
            gatedSpace,
            joinedTown,
            joiningTown,
            priceInWei,
            pricingModule,
            spaceId,
            tokensGatedBy,
        ],
    )

    return useMemo(
        () => ({
            startJoinPreLogin,
            startJoinMeetsRequirements,
            joinTown,
            end,
            spaceBeingJoined,
            joinStep,
            setJoinStep,
            startJoinDoesNotMeetRequirements,
            disableJoinUi,
            setDisableJoinUi,
            joinAfterSuccessfulCrossmint,
            assetModal,
            setAssetModal,
        }),
        [
            startJoinPreLogin,
            startJoinMeetsRequirements,
            joinTown,
            end,
            spaceBeingJoined,
            joinStep,
            setJoinStep,
            disableJoinUi,
            setDisableJoinUi,
            joinAfterSuccessfulCrossmint,
            assetModal,
            setAssetModal,
            startJoinDoesNotMeetRequirements,
        ],
    )
}

const params = new URLSearchParams(window.location.search)

// using searchParams from react-router-dom navigates and the params from privy redirect on login get wried and buggy
// https://github.com/remix-run/react-router/discussions/9851
function updateQueryStringValueWithoutNavigation(queryKey: string, queryValue: string) {
    const currentSearchParams = new URLSearchParams(window.location.search)
    const oldQuery = currentSearchParams.get(queryKey) ?? ''
    if (queryValue === oldQuery) {
        return
    }

    if (queryValue) {
        currentSearchParams.set(queryKey, queryValue)
    } else {
        currentSearchParams.delete(queryKey)
    }
    const newUrl = [window.location.pathname, currentSearchParams.toString()]
        .filter(Boolean)
        .join('?')
    window.history.replaceState(null, '', newUrl)
}

export enum JoinStep {
    None,
    JoinedTown,
    JoinedDefaultChannel,
    Done,
}

export const publicPageLoginStore = create<{
    spaceBeingJoined: string | undefined
    joinStep: JoinStep
    disableJoinUi: boolean
    assetModal: boolean
    setDisableJoinUi: (disableJoinUi: boolean) => void
    setAssetModal: (assetModal: boolean) => void
    setJoinStep: (step: JoinStep) => void
    setSpaceBeingJoined: (isJoining: string) => void
    end: () => void
}>((set) => ({
    joinStep: JoinStep.None,
    disableJoinUi: false,
    assetModal: false,
    setDisableJoinUi: (disableJoinUi) => set({ disableJoinUi }),
    setAssetModal: (assetModal) => set({ assetModal }),
    setJoinStep: (joinStep) => set({ joinStep }),
    spaceBeingJoined:
        // check privy oauth state also to prevent getting into join flow if user refreshes in the middle of the flow
        params.has(PRIVY_OAUTH_STATE) && params.has(JOIN)
            ? params.get(JOIN)?.toString()
            : undefined,
    setSpaceBeingJoined: (joiningSpaceId) => {
        updateQueryStringValueWithoutNavigation(JOIN, joiningSpaceId)
        set({ spaceBeingJoined: joiningSpaceId })
    },
    end: () => {
        updateQueryStringValueWithoutNavigation(JOIN, '')
        set({
            spaceBeingJoined: undefined,
            joinStep: JoinStep.None,
            assetModal: false,
            disableJoinUi: false,
        })
    },
}))
