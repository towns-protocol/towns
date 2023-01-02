import {
    HistoryVisibility,
    ICreateRoomOpts,
    ICreateRoomStateEvent,
    MatrixClient,
    Visibility,
} from 'matrix-js-sdk'
import { sleepUntil } from '../../utils/zion-utils'
import { CreateChannelInfo, RoomVisibility } from '../../types/matrix-types'
import { makeMatrixRoomIdentifier, MatrixRoomIdentifier } from '../../types/room-identifier'

export async function createMatrixChannel(
    matrixClient: MatrixClient,
    createInfo: CreateChannelInfo,
): Promise<MatrixRoomIdentifier> {
    // allow globally overriding the encryption in tests
    createInfo.disableEncryption =
        createInfo.disableEncryption ?? process.env.DISABLE_ENCRYPTION === 'true'
    const homeServerUrl = matrixClient.baseUrl
    // initial state
    const options: ICreateRoomOpts = {
        //room_alias_name: "my_room_alias3",
        visibility: createInfo.visibility as unknown as Visibility,
        name: createInfo.name,
        is_direct: false,
        initial_state: makeInitialState(homeServerUrl, createInfo, createInfo.disableEncryption),
        room_version: '10',
    }
    // create the room
    const response = await matrixClient.createRoom(options)
    if (createInfo.disableEncryption !== true) {
        const encrypted = await sleepUntil(matrixClient, (x) => x.isRoomEncrypted(response.room_id))
        console.log('Created channel isRoomEncrypted:', encrypted)
    }
    console.log('Created channel', JSON.stringify(response))
    if (createInfo.parentSpaceId) {
        try {
            await matrixClient.sendStateEvent(
                createInfo.parentSpaceId.networkId,
                'm.space.child',
                {
                    via: [homeServerUrl],
                },
                response.room_id,
            )
        } catch (ex) {
            console.error('Error sending child room event', ex)
            await matrixClient.leave(response.room_id)
            await matrixClient.forget(response.room_id, true)
            throw ex
        }
    }

    return makeMatrixRoomIdentifier(response.room_id)
}

function makeInitialState(
    homeServerUrl: string,
    createInfo: CreateChannelInfo,
    bRestrictedToParentSpace?: boolean, // todo restricted joins don't work https://github.com/HereNotThere/harmony/issues/197
): ICreateRoomStateEvent[] {
    const initialState: ICreateRoomStateEvent[] = [
        {
            type: 'm.room.history_visibility',
            state_key: '',
            content: {
                history_visibility: createInfo.historyVisibility ?? HistoryVisibility.Shared,
            },
        },
    ]

    if (createInfo.disableEncryption !== true) {
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

    if (createInfo.parentSpaceId) {
        initialState.push({
            type: 'm.space.parent',
            state_key: createInfo.parentSpaceId.networkId,
            content: {
                canonical: true,
                via: [homeServerUrl],
            },
        })
    }

    if (
        createInfo.parentSpaceId &&
        createInfo.visibility == RoomVisibility.Public &&
        bRestrictedToParentSpace
    ) {
        initialState.push({
            type: 'm.room.join_rules',
            state_key: '',
            content: {
                join_rule: 'restricted',
                allow: [
                    {
                        room_id: createInfo.parentSpaceId.networkId,
                        type: 'm.room_membership',
                    },
                ],
            },
        })
    } else {
        initialState.push({
            type: 'm.room.join_rules',
            state_key: '',
            content: {
                join_rule: createInfo.visibility == RoomVisibility.Public ? 'public' : 'invite',
            },
        })
    }
    return initialState
}
