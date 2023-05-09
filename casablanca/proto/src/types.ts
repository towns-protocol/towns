import { StreamEvent } from './gen/protocol_pb'

export type PayloadCaseType = StreamEvent['payload']['case']
export type PayloadValueType = StreamEvent['payload']['value']
