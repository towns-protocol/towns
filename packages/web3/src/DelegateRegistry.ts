import { ethers, utils } from 'ethers'

const v1RegistryContractAddress = '0x00000000000076a84fef008cdabe6409d2fe638b'
const delegationTypeAll = 1

const delegateRegistryJsonAbi = `
[
  {
    "type": "function",
    "name": "getDelegationsByDelegate",
    "inputs": [
      {
        "name": "delegate",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IDelegateRegistryV1.DelegationInfo[]",
        "components": [
          {
            "name": "type_",
            "type": "uint8",
            "internalType": "enum IDelegateRegistryV1.DelegationType"
          },
          {
            "name": "vault",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "delegate",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "contract_",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  }
]`

function newDelegateContract(provider: ethers.providers.BaseProvider): ethers.Contract {
    const iface = new utils.Interface(delegateRegistryJsonAbi)
    const humanReadableAbi = iface.format(utils.FormatTypes.full)
    return new ethers.Contract(v1RegistryContractAddress, humanReadableAbi, provider)
}

export async function computeDelegatorsForProvider(
    provider: ethers.providers.BaseProvider,
    wallets: string[],
): Promise<string[]> {
    const contract = newDelegateContract(provider)
    const delegators: string[] = []
    for (const wallet of wallets) {
        const delegations = await contract.callStatic.getDelegationsByDelegate(wallet)
        for (const delegation of delegations) {
            if (delegation[0] == delegationTypeAll) {
                delegators.push(delegation[1])
            }
        }
    }
    return delegators
}
