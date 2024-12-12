import { userOpsStore } from '@towns/userops'
import { SpaceInfo, useTownsClient } from 'use-towns-client'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useStore } from 'store/store'

export function useCrossmintHandlers(args: {
    setDisableUiWhileCrossmintPaymentPhase: (value: boolean) => void
    setShowCrossmintPayment: (value: boolean) => void
    spaceInfo: SpaceInfo | undefined
}) {
    const { setDisableUiWhileCrossmintPaymentPhase, setShowCrossmintPayment, spaceInfo } = args
    const { clientSingleton, signerContext } = useTownsClient()
    const spaceId = useSpaceIdFromPathname()
    const { joinAfterSuccessfulCrossmint, end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { setRecentlyMintedSpaceToken } = useStore()

    const handleCrossmintPaymentStart = () => {
        setDisableUiWhileCrossmintPaymentPhase(true)
    }

    const handleCrossmintFailure = () => {
        setDisableUiWhileCrossmintPaymentPhase(false)
    }

    const handleCrossmintComplete = async () => {
        if (clientSingleton && signerContext && spaceInfo?.name) {
            await joinAfterSuccessfulCrossmint({
                clientSingleton,
                signerContext,
                analyticsData: { spaceName: spaceInfo.name },
            })
            if (spaceId) {
                setRecentlyMintedSpaceToken({
                    spaceId,
                    isOwner: false,
                })
            }
        } else {
            console.warn(
                'Unable to join after Crossmint payment:',
                clientSingleton ? null : 'clientSingleton is undefined',
                signerContext ? null : 'signerContext is undefined',
                spaceInfo?.name ? null : 'spaceInfo.name is undefined',
            )
        }
        userOpsStore.getState().clear()
        endPublicPageLoginFlow()
        setShowCrossmintPayment(false)
    }

    return {
        handleCrossmintPaymentStart,
        handleCrossmintFailure,
        handleCrossmintComplete,
    }
}
