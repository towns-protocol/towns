/* eslint-disable @typescript-eslint/no-unused-vars -- we use destructure to exclude from rest */
import type { Address } from 'viem'
import {
    InteractionRequestPayload,
    InteractionRequestPayload_Signature_SignatureType,
    InteractionRequestPayload_Signature_SignatureValidation,
    InteractionRequestPayload_Form_Component,
    type PlainMessage,
} from '@towns-protocol/proto'
import { checkNever } from '@towns-protocol/sdk'

// Extract string keys from enum (exclude numeric reverse-mapping keys)
type EnumStringKeys<E> = Exclude<keyof E, number>

// Convert enum keys to lowercase string literals
type EnumToLowercase<E> = Lowercase<EnumStringKeys<E> & string>

// Derive SignatureMethod from enum keys (PERSONAL_SIGN, TYPED_DATA -> 'personal_sign', 'typed_data')
export type SignatureMethod = EnumToLowercase<
    typeof InteractionRequestPayload_Signature_SignatureType
>

// Derive SignatureValidation from enum keys
export type SignatureValidation = EnumToLowercase<
    typeof InteractionRequestPayload_Signature_SignatureValidation
>

// Extract case types from the original payload's content oneof
type ContentCase = NonNullable<InteractionRequestPayload['content']['case']>

// Extract value type for a specific case
type ContentValue<C extends ContentCase> = Extract<
    InteractionRequestPayload['content'],
    { case: C }
>['value']

// Extract component case types
type ComponentCase = NonNullable<InteractionRequestPayload_Form_Component['component']['case']>

// Extract component value for a specific case
type ComponentValue<C extends ComponentCase> = Extract<
    InteractionRequestPayload_Form_Component['component'],
    { case: C }
>['value']

// Flattened component: { id, type, ...spread value properties }
type FlattenedComponent<C extends ComponentCase> = {
    id: string
    type: C
} & PlainMessage<ComponentValue<C>>

// Union of all flattened components
export type FlattenedFormComponent = {
    [C in ComponentCase]: FlattenedComponent<C>
}[ComponentCase]

// Base properties shared by all flattened requests
type FlattenedRequestBase = {
    recipient?: Address
}

// Flatten signature: rename 'type' to 'method', convert to string literal, signerWallet as Address
export type FlattenedSignatureRequest = FlattenedRequestBase & {
    type: 'signature'
} & Omit<
        PlainMessage<ContentValue<'signature'>>,
        'type' | 'signatureValidation' | 'signerWallet'
    > & {
        method: SignatureMethod
        signatureValidation?: SignatureValidation
        signerWallet: Address
    }

// Flatten form: use flattened components
export type FlattenedFormRequest = FlattenedRequestBase & {
    type: 'form'
} & Omit<PlainMessage<ContentValue<'form'>>, 'components'> & {
        components: FlattenedFormComponent[]
    }

// Extract EVM content from transaction payload
type EVMContentValue = Extract<ContentValue<'transaction'>['content'], { case: 'evm' }>['value']

// EVM transaction type - future versions may add other chain types
export type EVMTransaction = Omit<PlainMessage<EVMContentValue>, 'to' | 'signerWallet'> & {
    to: Address
    signerWallet?: Address
}

// Flatten transaction: nest EVM fields under `tx` for clarity and future extensibility
export type FlattenedTransactionRequest = FlattenedRequestBase & {
    type: 'transaction'
} & Omit<PlainMessage<ContentValue<'transaction'>>, 'content'> & {
        tx: EVMTransaction
    }

export type FlattenedInteractionRequest =
    | FlattenedSignatureRequest
    | FlattenedFormRequest
    | FlattenedTransactionRequest

// Runtime conversion: lowercase string -> enum value
export function signatureMethodToEnum(
    method: SignatureMethod,
): InteractionRequestPayload_Signature_SignatureType {
    const key =
        method.toUpperCase() as keyof typeof InteractionRequestPayload_Signature_SignatureType
    const result = InteractionRequestPayload_Signature_SignatureType[key]
    if (result === undefined) {
        throw new Error(`Invalid signature method: ${method}`)
    }
    return result
}

export function signatureValidationToEnum(
    validation: SignatureValidation,
): InteractionRequestPayload_Signature_SignatureValidation {
    const key =
        validation.toUpperCase() as keyof typeof InteractionRequestPayload_Signature_SignatureValidation
    const result = InteractionRequestPayload_Signature_SignatureValidation[key]
    if (result === undefined) {
        throw new Error(`Invalid signature validation: ${validation}`)
    }
    return result
}

// Type guard to detect flattened vs original format
export function isFlattenedRequest(
    content: PlainMessage<InteractionRequestPayload['content']> | FlattenedInteractionRequest,
): content is FlattenedInteractionRequest {
    return (
        'type' in content &&
        typeof content.type === 'string' &&
        ['signature', 'form', 'transaction'].includes(content.type)
    )
}

// Convert flattened component to payload format
export function flattenedComponentToPayload(
    component: FlattenedFormComponent,
): PlainMessage<InteractionRequestPayload_Form_Component> {
    const { id, type } = component
    if (type === 'button') {
        return { id, component: { case: 'button', value: { label: component.label } } }
    }
    if (type === 'textInput') {
        return {
            id,
            component: { case: 'textInput', value: { placeholder: component.placeholder } },
        }
    }
    checkNever(type, `Unknown component type: ${type as string}`)
}

// Convert flattened request to payload content
export function flattenedToPayloadContent(
    payload: FlattenedInteractionRequest,
): PlainMessage<InteractionRequestPayload['content']> {
    switch (payload.type) {
        case 'signature': {
            const { type, method, signatureValidation, recipient, signerWallet, ...rest } = payload
            return {
                case: 'signature',
                value: {
                    ...rest,
                    signerWallet,
                    type: signatureMethodToEnum(method),
                    signatureValidation: signatureValidation
                        ? signatureValidationToEnum(signatureValidation)
                        : undefined,
                },
            }
        }
        case 'form': {
            const { type, components, recipient, ...rest } = payload
            return {
                case: 'form',
                value: {
                    ...rest,
                    components: components.map(flattenedComponentToPayload),
                },
            }
        }
        case 'transaction': {
            const { type, recipient, tx, ...rest } = payload
            return {
                case: 'transaction',
                value: {
                    ...rest,
                    content: {
                        case: 'evm',
                        value: tx,
                    },
                },
            }
        }
        default:
            checkNever(payload, `Unknown request type: ${(payload as { type: string }).type}`)
    }
}
