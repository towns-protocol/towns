import { useEffect, useState } from 'react'

import { ISpaceDapp } from '../client/web3/ISpaceDapp'
import { IWeb3Context } from '../components/Web3ContextProvider'
import { SpaceDapp } from '../client/web3/SpaceDapp'

export const useSpaceDapp = ({
    chainId,
    provider,
}: Pick<IWeb3Context, 'provider'> & {
    chainId: number
}) => {
    const [spaceDapp, setSpaceDapp] = useState<ISpaceDapp>()

    useEffect(() => {
        if (!chainId || !provider) {
            return
        }
        setSpaceDapp(new SpaceDapp(chainId, provider, provider?.getSigner()))
    }, [chainId, provider])

    return spaceDapp
}
