import {
    HistoryVisibility,
    ICreateRoomOpts,
    ICreateRoomStateEvent,
    MatrixClient,
    Visibility,
} from 'matrix-js-sdk'
import { sleepUntil } from '../../utils/zion-utils'
import { CreateSpaceInfo, RoomVisibility } from '../../types/matrix-types'
import { makeMatrixRoomIdentifier, MatrixRoomIdentifier } from '../../types/room-identifier'

export async function createMatrixSpace(
    matrixClient: MatrixClient,
    createSpaceInfo: CreateSpaceInfo,
): Promise<MatrixRoomIdentifier> {
    // allow globally overriding the encryption in tests
    createSpaceInfo.disableEncryption =
        createSpaceInfo.disableEncryption ?? process.env.DISABLE_ENCRYPTION === 'true'

    const options: ICreateRoomOpts = {
        visibility: createSpaceInfo.visibility as unknown as Visibility,
        name: createSpaceInfo.name,
        is_direct: false,
        room_version: '10',
        creation_content: {
            type: 'm.space',
        },
        initial_state: makeInitialState(createSpaceInfo),
        power_level_content_override: {
            invite: createSpaceInfo.visibility == RoomVisibility.Public ? 0 : 50,
        },
    }
    const response = await matrixClient.createRoom(options)
    if (!createSpaceInfo.disableEncryption === true) {
        const encrypted = await sleepUntil(matrixClient, (x) => x.isRoomEncrypted(response.room_id))
        console.log('Created space isRoomEncrypted:', encrypted)
    }
    console.log('Created space', options, JSON.stringify(response))
    return makeMatrixRoomIdentifier(response.room_id)
}

function makeInitialState(createSpaceInfo: CreateSpaceInfo) {
    const initialState: ICreateRoomStateEvent[] = [
        {
            type: 'm.room.join_rules',
            state_key: '',
            content: {
                join_rule:
                    createSpaceInfo.visibility == RoomVisibility.Public ? 'public' : 'invite',
            },
        },
        {
            type: 'm.room.history_visibility',
            state_key: '',
            content: {
                history_visibility: HistoryVisibility.Shared,
            },
        },
    ]
    if (createSpaceInfo.disableEncryption !== true) {
        initialState.push({
            content: {
                algorithm: 'm.megolm.v1.aes-sha2',
                rotation_period_ms: 604800000,
                rotation_period_msgs: 100,
            },
            state_key: '',
            type: 'm.room.encryption',
        })
    }
    return initialState
}
