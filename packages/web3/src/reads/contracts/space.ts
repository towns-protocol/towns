import { Abi, Address, getContract, isAddress } from 'viem'
import BanningAbi from '@towns-protocol/generated/dev/abis/IBanning.abi'
import MembershipAbi from '@towns-protocol/generated/dev/abis/MembershipFacet.abi'
import ERC721A from '@towns-protocol/generated/dev/abis/IERC721A.abi'
import ERC721AQueryableAbi from '@towns-protocol/generated/dev/abis/IERC721AQueryable.abi'
import { ReadClient } from '../clients/readClient'
import { ContractInstance } from './types'
import { SpaceAddressFromSpaceId } from '../../utils/ut'
import { LRUCache } from 'lru-cache'

export type SpaceReads = {
    membership: ContractInstance<typeof MembershipAbi>
    banning: ContractInstance<typeof BanningAbi>
    erc721a: ContractInstance<typeof ERC721A>
    erc721aQueryable: ContractInstance<typeof ERC721AQueryableAbi>
}

export function createSpaceContracts(publicClient: ReadClient) {
    const spaces = new LRUCache<Address, SpaceReads>({
        max: 100,
    })

    return {
        get: (spaceId: string): SpaceReads => {
            let address = spaceId
            if (!isAddress(address)) {
                address = SpaceAddressFromSpaceId(spaceId)
            }
            if (!isAddress(address)) {
                throw new Error('Invalid space address')
            }

            const space = spaces.get(address)

            if (space) {
                return space
            }

            const makeInstance = <Abi_ extends Abi>(abi: Abi_) =>
                getContract({
                    address,
                    abi,
                    client: {
                        public: publicClient,
                    },
                })

            const contracts = {
                membership: makeInstance(MembershipAbi),
                banning: makeInstance(BanningAbi),
                erc721a: makeInstance(ERC721A),
                erc721aQueryable: makeInstance(ERC721AQueryableAbi),
            }

            spaces.set(address, contracts)
            return contracts
        },
    }
}
