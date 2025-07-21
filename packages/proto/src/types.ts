import { Snapshot, StreamEvent } from './gen/protocol_pb'
import { FullyReadMarkers_Content } from './gen/payloads_pb'

export type SnapshotCaseType = Snapshot['content']['case']
export type SnapshotValueType = Snapshot['content']['value']

export type PayloadCaseType = StreamEvent['payload']['case']
export type PayloadValueType = StreamEvent['payload']['value']

export type FullyReadMarker = PlainMessage<FullyReadMarkers_Content>

export type ContentCaseType = Extract<
    StreamEvent['payload']['value'],
    { content: any }
>['content']['case']

// Check if type has $typeName and potentially $unknown properties
type HasMessageProperties<T> = T extends { $typeName: any } ? true : false

// Special handling for built-in object types we don't want to transform
type IsBuiltInObjectType<T> = T extends Uint8Array
    ? true
    : T extends Date
      ? true
      : T extends RegExp
        ? true
        : T extends Map<any, any>
          ? true
          : T extends Set<any>
            ? true
            : T extends Promise<any>
              ? true
              : T extends ArrayBuffer
                ? true
                : T extends DataView
                  ? true
                  : false

// connect-es v2 dropped the PlainMessage type
// if you want to use a Message interface as a parameter to your api function you want to
// strip out $typeName as a required field, but leave the rest of the properties as required
// the lib has the MessageInitShape type, but all fields are optional
// if you want typescript to tell you when you're missing required fields, use PlainMessage
export type PlainMessage<T> =
    // Distribute over unions
    T extends any
        ? // 1) If it has Message properties ($typeName and optionally $unknown), remove those and recurse
          HasMessageProperties<T> extends true
            ? {
                  [K in keyof T as K extends '$typeName' | '$unknown' ? never : K]: PlainMessage<
                      T[K]
                  >
              }
            : // 2) If it's an array, recurse on the element type
              T extends (infer U)[]
              ? PlainMessage<U>[]
              : // 3) If it is a oneof shape (has `case` and `value`), preserve that structure
                T extends { case: unknown; value: unknown }
                ? {
                      // Keep `case` as is, but recurse on `value` and any other fields
                      [K in keyof T]: K extends 'value' ? PlainMessage<T[K]> : T[K]
                  }
                : // 4) If it's a built-in object type we don't want to transform, leave it as is
                  IsBuiltInObjectType<T> extends true
                  ? T
                  : // 5) If it's some other object, recurse on each property
                    T extends object
                    ? {
                          [K in keyof T]: PlainMessage<T[K]>
                      }
                    : // 6) Otherwise, leave it alone (primitives, etc.)
                      T
        : never
