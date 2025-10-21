import { Abi, GetContractReturnType } from 'viem'
import { ReadClient } from '../clients/readClient'

export type ContractInstance<Abi_ extends Abi> = GetContractReturnType<Abi_, { public: ReadClient }>
