import { Snapshot, StreamEvent } from './gen/protocol_pb'

export type SnapshotCaseType = Snapshot['content']['case']
export type SnapshotValueType = Snapshot['content']['value']

export type PayloadCaseType = StreamEvent['payload']['case']
export type PayloadValueType = StreamEvent['payload']['value']
