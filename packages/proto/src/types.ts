import { Snapshot, StreamEvent } from './gen/protocol_pb'
import { FullyReadMarkers_Content } from './gen/payloads_pb'
import { Message } from '@bufbuild/protobuf'

export type SnapshotCaseType = Snapshot['content']['case']
export type SnapshotValueType = Snapshot['content']['value']

export type PayloadCaseType = StreamEvent['payload']['case']
export type PayloadValueType = StreamEvent['payload']['value']

export type FullyReadMarker = FullyReadMarkers_Content

// Check if type has $typeName and potentially $unknown properties
type HasMessageProperties<T> = T extends { $typeName: any } ? true : false

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
            : // 4) Otherwise, leave it alone (primitives, etc.)
              T
        : never
