import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { LogDescription } from 'ethers/lib/utils'
import { dlogger } from '@towns-protocol/dlog'
import { ContractType } from '../types/typechain'
import { IArchitect__factory } from '@towns-protocol/generated/dev/typings/factories/IArchitect__factory'
const logger = dlogger('csb:SpaceDapp:debug')

export class ISpaceArchitectShim extends BaseContractShim<
    ContractType<typeof IArchitect__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IArchitect__factory.connect.bind(IArchitect__factory))
    }

    public getSpaceAddressFromLog(log: ethers.providers.Log, userId: string) {
        let spaceAddress: string | undefined

        try {
            const parsedLog = this.parseLog(log)
            if (
                isSpaceCreatedLog(parsedLog) &&
                parsedLog.args.owner.toLowerCase() === userId.toLowerCase()
            ) {
                logger.log(`Event ${parsedLog.name} found: `, parsedLog.args)
                spaceAddress = parsedLog.args.space
            }
        } catch (error) {
            // This log wasn't from the contract we're interested in
        }
        return spaceAddress
    }
}

function isSpaceCreatedLog(log: ethers.utils.LogDescription): log is SpaceCreatedLog {
    const { name, args } = log
    return name === 'SpaceCreated' && 'owner' in args && 'space' in args && 'tokenId' in args
}

class SpaceCreatedLog extends LogDescription {
    readonly args: [] & {
        owner: string
        space: string
        tokenId: string
    }
    constructor(log: LogDescription) {
        super(log)
        this.args = [] as any
        Object.assign(this.args, ...log.args)
    }
}
