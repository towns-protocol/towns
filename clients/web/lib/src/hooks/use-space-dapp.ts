import { ContractVersion } from '../client/ZionClientTypes'
import { IWeb3Context } from '../components/Web3ContextProvider'
import { useEffect, useState } from 'react'
import { ISpaceDapp } from '../client/web3/ISpaceDapp'
import { SpaceDappV2 } from '../client/web3/SpaceDappV2'
import { SpaceDappV1 } from '../client/web3/SpaceDappV1'

export const useSpaceDapp = ({
    chain,
    provider,
    version,
}: Pick<IWeb3Context, 'chain' | 'provider'> & { version?: ContractVersion }) => {
    const [spaceDapp, setSpaceDapp] = useState<ISpaceDapp>()

    useEffect(() => {
        if (!chain || !provider) return
        if (version === ContractVersion.V2) {
            setSpaceDapp(new SpaceDappV2(chain.id, provider, provider?.getSigner()))
        } else {
            setSpaceDapp(new SpaceDappV1(chain.id, provider, provider?.getSigner()))
        }
    }, [chain, provider, version])

    return spaceDapp
}
