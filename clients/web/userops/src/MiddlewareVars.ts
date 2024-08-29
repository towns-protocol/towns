import { FunctionHash, TimeTrackerEvents } from './types'
import { BigNumberish } from 'ethers'

type MiddlewareProps = {
    /**
     * Tracks the number of times the user operation has been attempted
     * Not currently used but may be used for logging or retry logic
     */
    operationAttempt: number
    txValue?: BigNumberish | undefined
    sequenceName?: TimeTrackerEvents | undefined
    functionHashForPaymasterProxy?: FunctionHash | undefined
    spaceId?: string | undefined
}

export class MiddlewareVars {
    private middlewareProps: MiddlewareProps

    constructor(middlewareProps: MiddlewareProps) {
        this.middlewareProps = middlewareProps
    }

    public reset(
        props: Pick<
            MiddlewareProps,
            'sequenceName' | 'functionHashForPaymasterProxy' | 'spaceId' | 'txValue'
        >,
    ) {
        this.middlewareProps = {
            operationAttempt: 1,
            sequenceName: props.sequenceName,
            functionHashForPaymasterProxy: props.functionHashForPaymasterProxy,
            spaceId: props.spaceId,
            txValue: props.txValue,
        }
    }

    public get txValue() {
        return this.middlewareProps?.txValue
    }

    public get operationAttempt() {
        return this.middlewareProps?.operationAttempt
    }

    public get sequenceName() {
        return this.middlewareProps?.sequenceName
    }

    public get functionHashForPaymasterProxy() {
        return this.middlewareProps?.functionHashForPaymasterProxy
    }

    public get spaceId() {
        return this.middlewareProps?.spaceId
    }

    public set operationAttempt(value: number) {
        this.middlewareProps.operationAttempt = value
    }

    public set sequenceName(name: TimeTrackerEvents | undefined) {
        this.middlewareProps.sequenceName = name
    }

    public set functionHashForPaymasterProxy(hash: FunctionHash | undefined) {
        this.middlewareProps.functionHashForPaymasterProxy = hash
    }

    public set spaceId(townId: string | undefined) {
        this.middlewareProps.spaceId = townId
    }

    public set txValue(value: BigNumberish | undefined) {
        this.middlewareProps.txValue = value
    }
}
