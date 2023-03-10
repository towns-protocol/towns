import {
    CallOptions,
    createConnectTransport,
    makeAnyClient,
    PromiseClient,
    StreamResponse,
    Transport,
} from '@bufbuild/connect-web'
import { Message, MethodInfo, MethodKind, PartialMessage, ServiceType } from '@bufbuild/protobuf'
import { ZionService } from '@zion/proto'
import debug from 'debug'
import EventTarget, { setMaxListeners } from 'events'
import { isDefined } from './check'

const log = debug('zion:rpc_client')
const logProtos = debug('zion:rpc_client:protos')

export type ZionRpcClientType = PromiseClient<typeof ZionService> & {
    close: () => Promise<void>
}

export const makeZionRpcClient = (
    dest: Transport | string,
    defaultOptions?: CallOptions,
): ZionRpcClientType => {
    let transport: Transport
    if (typeof dest === 'string') {
        transport = createConnectTransport({ baseUrl: dest, useBinaryFormat: true })
    } else {
        transport = dest
    }

    if (!isDefined(defaultOptions)) {
        defaultOptions = {}
    }

    let abortController: AbortController | undefined = undefined
    if (!isDefined(defaultOptions.signal)) {
        abortController = new AbortController()
        if (abortController.signal instanceof EventTarget) {
            setMaxListeners(200, abortController.signal)
        }
        abortController.signal.addEventListener('abort', () => {
            log('abortController aborted')
        })
        defaultOptions.signal = abortController.signal
    }

    const client: any = makeAnyClient(ZionService, (method) => {
        switch (method.kind) {
            case MethodKind.Unary:
                return createUnaryFn(transport, ZionService, method, defaultOptions!)
            case MethodKind.ServerStreaming:
                return createServerStreamingFn(transport, ZionService, method, defaultOptions!)
            default:
                return null
        }
    })

    client.close = async (): Promise<void> => {
        log('closing client')
        if (isDefined(abortController)) {
            abortController.abort()
        }
        log('client closed')
    }
    return client as ZionRpcClientType
}

type UnaryFn<I extends Message<I>, O extends Message<O>> = (
    request: PartialMessage<I>,
    options?: CallOptions,
) => Promise<O>

function createUnaryFn<I extends Message<I>, O extends Message<O>>(
    transport: Transport,
    service: ServiceType,
    method: MethodInfo<I, O>,
    defaultOptions: CallOptions,
): UnaryFn<I, O> {
    return async function (requestMessage: PartialMessage<I>, options?: CallOptions): Promise<O> {
        if (logProtos.enabled) {
            logProtos('RPC call START', service.typeName, method.name, requestMessage)
        } else {
            log('RPC call START', service.typeName, method.name)
        }
        try {
            const response = await transport.unary(
                service,
                method,
                options?.signal ?? defaultOptions.signal,
                options?.timeoutMs ?? defaultOptions.timeoutMs,
                options?.headers ?? defaultOptions.headers,
                requestMessage,
            )
            ;(options?.onHeader ?? defaultOptions.onHeader)?.(response.header)
            ;(options?.onTrailer ?? defaultOptions.onTrailer)?.(response.trailer)
            if (logProtos.enabled) {
                logProtos('RPC call END', service.typeName, method.name, response.message.toJson())
            } else {
                log('RPC call END', service.typeName, method.name)
            }

            return response.message
        } catch (err) {
            log('RPC call ERROR', service.typeName, method.name, err)
            throw err
        }
    }
}

type ServerStreamingFn<I extends Message<I>, O extends Message<O>> = (
    request: PartialMessage<I>,
    options?: CallOptions,
) => AsyncIterable<O>

function createServerStreamingFn<I extends Message<I>, O extends Message<O>>(
    transport: Transport,
    service: ServiceType,
    method: MethodInfo<I, O>,
    defaultOptions: CallOptions,
): ServerStreamingFn<I, O> {
    return function (requestMessage, options): AsyncIterable<O> {
        let streamResponse: StreamResponse<O> | undefined
        return {
            [Symbol.asyncIterator](): AsyncIterator<O> {
                return {
                    async next() {
                        if (!streamResponse) {
                            streamResponse = await transport.serverStream(
                                service,
                                method,
                                options?.signal ?? defaultOptions.signal,
                                options?.timeoutMs ?? defaultOptions.timeoutMs,
                                options?.headers ?? defaultOptions.headers,
                                requestMessage,
                            )
                            ;(options?.onHeader ?? defaultOptions.onHeader)?.(streamResponse.header)
                        }
                        const result = await streamResponse.read()
                        if (result.done) {
                            ;(options?.onTrailer ?? defaultOptions.onTrailer)?.(
                                streamResponse.trailer,
                            )
                            return {
                                done: true,
                                value: undefined,
                            }
                        }
                        return {
                            done: false,
                            value: result.value,
                        }
                    },
                }
            },
        }
    }
}
