import {
    IArchitect as LocalhostContract,
    IArchitectInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IArchitect'

import LocalhostAbi from '@river-build/generated/dev/abis/Architect.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { LogDescription } from 'ethers/lib/utils'
import { dlogger } from '@river-build/dlog'
const logger = dlogger('csb:SpaceDapp:debug')

export class ISpaceArchitectShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
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
