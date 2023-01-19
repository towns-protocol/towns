import { useEffect, useState } from 'react'

import { ISpaceDapp } from '../client/web3/ISpaceDapp'
import { IWeb3Context } from '../components/Web3ContextProvider'
import { SpaceDapp } from '../client/web3/SpaceDapp'

export const useSpaceDapp = ({ chain, provider }: Pick<IWeb3Context, 'chain' | 'provider'>) => {
    const [spaceDapp, setSpaceDapp] = useState<ISpaceDapp>()

    useEffect(() => {
        if (!chain || !provider) return
        setSpaceDapp(new SpaceDapp(chain.id, provider, provider?.getSigner()))
    }, [chain, provider])

    return spaceDapp
}
