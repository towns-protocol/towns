import { InboundGroupSessionData } from '../olmDevice'
import { TrackingStatus } from '../deviceList'
import { IDevice } from '../deviceInfo'

export interface IRoomEncryption {
    algorithm: string
    rotation_period_ms?: number
    rotation_period_msgs?: number
}

export interface ISession {
    streamId: string
    sessionId: string
    sessionData?: InboundGroupSessionData
}

export interface IWithheld {
    stream_id: string
    code: string
    reason: string
}

export interface IProblem {
    type: string
    fixed: boolean
    time: number
}

export interface ISessionInfo {
    deviceKey: string
    sessionId: string
    session: string
    lastReceivedMessageTs: number
}

export interface IDeviceData {
    devices: {
        [userId: string]: {
            [deviceId: string]: IDevice
        }
    }
    trackingStatus: {
        [userId: string]: TrackingStatus
    }
    syncToken?: string
}

export interface AccountRecord {
    id: string
    accountPickle: string
}

export interface OlmSessionRecord {
    deviceKey: string
    sessionId: string
    session: string
    lastReceivedMessageTs: number
}

export interface MegolmSessionRecord {
    sessionId: string
    session: string
    streamId: string
}
