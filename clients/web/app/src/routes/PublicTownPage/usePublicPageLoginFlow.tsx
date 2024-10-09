import React, { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { TSigner, sleep, useTownsClient, useTownsContext } from 'use-towns-client'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useStore } from 'store/store'
import { mapToErrorMessage } from '@components/Web3/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { Analytics } from 'hooks/useAnalytics'

const JOIN = 'join'
const PRIVY_OAUTH_STATE = 'privy_oauth_state'

type TClientSingleton = ReturnType<typeof useTownsClient>['clientSingleton']
type TSignerContext = ReturnType<typeof useTownsContext>['signerContext']

export function usePublicPageLoginFlow() {
    const { setRecentlyMintedSpaceToken } = useStore()
    const spaceId = useSpaceIdFromPathname()

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

    const joinTown = useCallback(
        async ({
            signer,
            clientSingleton,
            signerContext,
            source,
        }: {
            signer: TSigner
            clientSingleton: TClientSingleton
            signerContext: TSignerContext
            source: string
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
                        message={
                            mapToErrorMessage({
                                error: new Error(
                                    `[usePublicPageLoginFlow] missing params: ${missingParams.join(
                                        ', ',
                                    )} - ${source}`,
                                ),
                                source,
                            }) ?? ''
                        }
                    />
                ))
                end()
                return
            }

            Analytics.getInstance().track('joining town', {
                spaceId,
            })

            try {
                const result = await retryPrivyErrors(() =>
                    clientSingleton.joinTown(spaceId, signer, signerContext, (status) => {
                        if (status === 'membership-minted') {
                            setRecentlyMintedSpaceToken({ spaceId: spaceId, isOwner: false })
                        }
                    }),
                )

                if (result) {
                    // success
                    Analytics.getInstance().track('joined town', {
                        spaceId,
                    })
                } else {
                    end()
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            toast={toast}
                            message={
                                mapToErrorMessage({
                                    error: new Error('unable to join space unknown'),
                                    source: 'join space',
                                }) ?? ''
                            }
                        />
                    ))
                }
            } catch (error) {
                end()
                const _error = error as Error

                popupToast(({ toast }) => (
                    <StandardToast.Error
                        toast={toast}
                        message={mapToErrorMessage({ error: _error, source: 'join space' }) ?? ''}
                    />
                ))
            }
        },
        [spaceId, setRecentlyMintedSpaceToken, end],
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
        }: {
            signer: TSigner
            clientSingleton: TClientSingleton
            signerContext: TSignerContext
            source: string
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

// Privy seems to misbehave and throw "Unknown connector error" when requesting another signature too quickly!!
// This can happen on initial login from a public town page, when a user logs in with embedded wallet, other signature requests might come in (i.e. sign for river delegate key, sign for setting up userops, etc.)
async function retryPrivyErrors<T>(
    fn: () => Promise<T>,
    maxRetries: number = 5,
    initialDelay: number = 1000,
): Promise<T> {
    let retries = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn()
        } catch (error) {
            // Scoping this to only retry on "Unknown Connector" errors from Privy
            // but we can expand to include all errors if needed - but errors could come from userops and/or river so for now lets just try privy
            if (
                !(error instanceof Error) ||
                !error.message.includes('Unknown connector error') ||
                retries >= maxRetries
            ) {
                throw error
            }

            retries++
            const delay = initialDelay * Math.pow(2, retries)
            console.warn(`Unknown connector error. Retry attempt ${retries + 1} after ${delay}ms`)
            await sleep(delay)
        }
    }
}
