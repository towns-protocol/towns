// forked from https://raw.githubusercontent.com/bufbuild/connect-es/main/packages/connect/src/promise-client.ts to add logging
import { CallOptions, Code, ConnectError, Transport, makeAnyClient } from '@bufbuild/connect'
import { createGrpcWebTransport } from '@bufbuild/connect-web'
import {
    Message,
    MethodInfo,
    MethodInfoBiDiStreaming,
    MethodInfoClientStreaming,
    MethodInfoServerStreaming,
    MethodInfoUnary,
    MethodKind,
    PartialMessage,
    ServiceType,
} from '@bufbuild/protobuf'
import { StreamService } from '@towns/proto'
import debug from 'debug'
import EventTarget, { setMaxListeners } from 'events'
import { isDefined } from './check'

const log = debug('csb:rpc_client')
const logProtos = debug('csb:rpc_client:protos')

// prettier-ignore

/**
 * Create an asynchronous iterable from an array.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function* createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
    yield* items;
  }
/**
 * PromiseClient is a simple client that supports unary and server-streaming
 * methods. Methods will produce a promise for the response message,
 * or an asynchronous iterable of response messages.
 */
export type PromiseClient<T extends ServiceType> = {
    [P in keyof T['methods']]: T['methods'][P] extends MethodInfoUnary<infer I, infer O>
        ? (request: PartialMessage<I>, options?: CallOptions) => Promise<O>
        : T['methods'][P] extends MethodInfoServerStreaming<infer I, infer O>
        ? (request: PartialMessage<I>, options?: CallOptions) => AsyncIterable<O>
        : T['methods'][P] extends MethodInfoClientStreaming<infer I, infer O>
        ? (request: AsyncIterable<PartialMessage<I>>, options?: CallOptions) => Promise<O>
        : T['methods'][P] extends MethodInfoBiDiStreaming<infer I, infer O>
        ? (request: AsyncIterable<PartialMessage<I>>, options?: CallOptions) => AsyncIterable<O>
        : never
}

export type StreamRpcClientType = PromiseClient<typeof StreamService> & {
    close: () => Promise<void>
}

export function makeStreamRpcClient(
    dest: Transport | string,
    defaultOptions?: CallOptions,
): StreamRpcClientType {
    let transport: Transport
    if (typeof dest === 'string') {
        transport = createGrpcWebTransport({ baseUrl: dest, useBinaryFormat: true })
    } else {
        transport = dest
    }

    const options = isDefined(defaultOptions) ? defaultOptions : {}

    let abortController: AbortController | undefined = undefined
    if (!isDefined(options.signal)) {
        abortController = new AbortController()
        if (abortController.signal instanceof EventTarget) {
            setMaxListeners(200, abortController.signal)
        }
        abortController.signal.addEventListener('abort', () => {
            log('abortController aborted')
        })
        options.signal = abortController.signal
    }

    const client = makeAnyClient(StreamService, (method) => {
        switch (method.kind) {
            case MethodKind.Unary:
                return createUnaryFn(transport, StreamService, method, options)
            case MethodKind.ServerStreaming:
                return createServerStreamingFn(transport, StreamService, method, options)
            case MethodKind.ClientStreaming:
                return createClientStreamingFn(transport, StreamService, method, options)
            case MethodKind.BiDiStreaming:
                return createBiDiStreamingFn(transport, StreamService, method, options)
            default:
                return null
        }
    }) as StreamRpcClientType

    client.close = async (): Promise<void> => {
        log('closing client')
        if (isDefined(abortController)) {
            abortController.abort()
        }
        log('client closed')
    }
    return client
}

/**
 * UnaryFn is the method signature for a unary method of a PromiseClient.
 */
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
    return async function (requestMessage, options) {
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

/**
 * ServerStreamingFn is the method signature for a server-streaming method of
 * a PromiseClient.
 */
type ServerStreamingFn<I extends Message<I>, O extends Message<O>> = (
    request: PartialMessage<I>,
    options?: CallOptions,
) => AsyncIterable<O>

export function createServerStreamingFn<I extends Message<I>, O extends Message<O>>(
    transport: Transport,
    service: ServiceType,
    method: MethodInfo<I, O>,
    defaultOptions: CallOptions,
): ServerStreamingFn<I, O> {
    return async function* (requestMessage, options): AsyncIterable<O> {
        if (logProtos.enabled) {
            logProtos('RPC call START', service.typeName, method.name, requestMessage)
        } else {
            log('RPC call START', service.typeName, method.name)
        }

        try {
            const inputMessage =
                requestMessage instanceof method.I ? requestMessage : new method.I(requestMessage)
            const response = await transport.stream<I, O>(
                service,
                method,
                options?.signal ?? defaultOptions.signal,
                options?.timeoutMs ?? defaultOptions.timeoutMs,
                options?.headers ?? defaultOptions.headers,
                createAsyncIterable([inputMessage]),
            )
            ;(options?.onHeader ?? defaultOptions.onHeader)?.(response.header)
            yield* response.message
            ;(options?.onTrailer ?? defaultOptions.onTrailer)?.(response.trailer)
        } catch (err) {
            log('RPC call ERROR', service.typeName, method.name, err)
            throw err
        }
    }
}

/**
 * ClientStreamFn is the method signature for a client streaming method of a
 * PromiseClient.
 */
type ClientStreamingFn<I extends Message<I>, O extends Message<O>> = (
    request: AsyncIterable<PartialMessage<I>>,
    options?: CallOptions,
) => Promise<O>

export function createClientStreamingFn<I extends Message<I>, O extends Message<O>>(
    transport: Transport,
    service: ServiceType,
    method: MethodInfo<I, O>,
    defaultOptions: CallOptions,
): ClientStreamingFn<I, O> {
    return async function (
        request: AsyncIterable<PartialMessage<I>>,
        options?: CallOptions,
    ): Promise<O> {
        if (logProtos.enabled) {
            logProtos('RPC call START', service.typeName, method.name)
        } else {
            log('RPC call START', service.typeName, method.name)
        }

        try {
            // eslint-disable-next-line no-inner-declarations
            async function* input() {
                for await (const partial of request) {
                    yield partial instanceof method.I ? partial : new method.I(partial)
                }
            }
            const response = await transport.stream<I, O>(
                service,
                method,
                options?.signal ?? defaultOptions.signal,
                options?.timeoutMs ?? defaultOptions.timeoutMs,
                options?.headers ?? defaultOptions.headers,
                input(),
            )
            ;(options?.onHeader ?? defaultOptions.onHeader)?.(response.header)
            let singleMessage: O | undefined
            for await (const message of response.message) {
                singleMessage = message
            }
            if (!singleMessage) {
                throw new ConnectError('protocol error: missing response message', Code.Internal)
            }
            ;(options?.onTrailer ?? defaultOptions.onTrailer)?.(response.trailer)
            return singleMessage
        } catch (err) {
            log('RPC call ERROR', service.typeName, method.name, err)
            throw err
        }
    }
}

/**
 * BiDiStreamFn is the method signature for a bi-directional streaming method
 * of a PromiseClient.
 */
type BiDiStreamingFn<I extends Message<I>, O extends Message<O>> = (
    request: AsyncIterable<PartialMessage<I>>,
    options?: CallOptions,
) => AsyncIterable<O>

export function createBiDiStreamingFn<I extends Message<I>, O extends Message<O>>(
    transport: Transport,
    service: ServiceType,
    method: MethodInfo<I, O>,
    defaultOptions: CallOptions,
): BiDiStreamingFn<I, O> {
    return async function* (
        request: AsyncIterable<PartialMessage<I>>,
        options?: CallOptions,
    ): AsyncIterable<O> {
        if (logProtos.enabled) {
            logProtos('RPC call START', service.typeName, method.name)
        } else {
            log('RPC call START', service.typeName, method.name)
        }

        try {
            // eslint-disable-next-line no-inner-declarations
            async function* input() {
                for await (const partial of request) {
                    yield partial instanceof method.I ? partial : new method.I(partial)
                }
            }
            const response = await transport.stream<I, O>(
                service,
                method,
                options?.signal ?? defaultOptions.signal,
                options?.timeoutMs ?? defaultOptions.timeoutMs,
                options?.headers ?? defaultOptions.headers,
                input(),
            )
            ;(options?.onHeader ?? defaultOptions.onHeader)?.(response.header)
            yield* response.message
            ;(options?.onTrailer ?? defaultOptions.onTrailer)?.(response.trailer)
        } catch (err) {
            log('RPC call ERROR', service.typeName, method.name, err)
            throw err
        }
    }
}
