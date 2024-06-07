import { PlainMessage } from '@bufbuild/protobuf'
import { Snapshot, StreamEvent } from './gen/protocol_pb'
import { FullyReadMarkers_Content } from './gen/payloads_pb'

export type SnapshotCaseType = Snapshot['content']['case']
export type SnapshotValueType = Snapshot['content']['value']

export type PayloadCaseType = StreamEvent['payload']['case']
export type PayloadValueType = StreamEvent['payload']['value']

// we convert messages to plain objects to make them easier to work with in react
// statemanagement in react is based on reference equality, if we mutate classes,
// we don't get the benefits of react's state management, so we convert to typed plain objects
export type FullyReadMarker = PlainMessage<FullyReadMarkers_Content>
