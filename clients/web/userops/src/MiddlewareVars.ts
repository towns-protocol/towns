import { FunctionHash, TimeTrackerEvents } from './types'

type MiddlewareProps = {
    preverificationGasMultiplierValue: number
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
        props: Pick<MiddlewareProps, 'sequenceName' | 'functionHashForPaymasterProxy' | 'spaceId'>,
    ) {
        this.middlewareProps = {
            preverificationGasMultiplierValue: 1,
            sequenceName: props.sequenceName,
            functionHashForPaymasterProxy: props.functionHashForPaymasterProxy,
            spaceId: props.spaceId,
        }
    }

    public get preverificationGasMultiplierValue() {
        return this.middlewareProps?.preverificationGasMultiplierValue
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

    public set preverificationGasMultiplierValue(value: number) {
        this.middlewareProps.preverificationGasMultiplierValue = value
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
}
