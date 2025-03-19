import { userOpsStore } from '@towns/userops'
import { SpaceInfo, useTownsClient } from 'use-towns-client'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useStore } from 'store/store'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useUserOpTxModalContext } from '../UserOpTxModalContext'

export function useCrossmintHandlers(args: {
    setDisableModalActions: (value: boolean) => void
    spaceInfo: SpaceInfo | undefined
}) {
    const { setDisableModalActions, spaceInfo } = args
    const { setView } = useUserOpTxModalContext()
    const { clientSingleton, signerContext } = useTownsClient()
    const spaceId = useSpaceIdFromPathname()
    const { joinAfterSuccessfulCrossmint, end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { setRecentlyMintedSpaceToken } = useStore()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data

    const handleCrossmintPaymentStart = () => {
        setDisableModalActions(true)
    }

    const handleCrossmintFailure = () => {
        setDisableModalActions(false)
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
        userOpsStore.getState().reset(myAbstractAccountAddress)
        endPublicPageLoginFlow()
        setView(undefined)
    }

    return {
        handleCrossmintPaymentStart,
        handleCrossmintFailure,
        handleCrossmintComplete,
    }
}
