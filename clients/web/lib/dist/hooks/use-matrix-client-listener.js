"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMatrixClientListener = void 0;
const matrix_js_sdk_1 = require("matrix-js-sdk");
const react_1 = require("react");
const matrix_types_1 = require("../types/matrix-types");
const store_1 = require("../store/store");
function useMatrixClientListener() {
    const { accessToken, homeServer, isAuthenticated, userId, leaveRoom, setNewMessage, setRoom, setRoomName, setRooms, updateMembership, } = (0, store_1.useStore)();
    const matrixClientRef = (0, react_1.useRef)();
    const [syncRoomId, setSyncRoomId] = (0, react_1.useState)("");
    const [membershipChanged, setMembershipChanged] = (0, react_1.useState)("");
    (0, react_1.useEffect)(function () {
        if (matrixClientRef.current) {
            const room = matrixClientRef.current.getRoom(syncRoomId);
            if (room) {
                console.log(`Listener: sync room`, {
                    roomId: room.roomId,
                    name: room.name,
                    membership: room.getMyMembership(),
                });
                setRoom(room);
            }
            else {
                console.log(`Listener: cannot sync room ${syncRoomId}`);
            }
        }
    }, [syncRoomId, membershipChanged, setRoom]);
    const startClient = (0, react_1.useCallback)(function () {
        return __awaiter(this, void 0, void 0, function* () {
            if (accessToken && homeServer && userId) {
                const options = {
                    baseUrl: homeServer,
                    accessToken: accessToken,
                    userId: userId,
                };
                const client = (0, matrix_js_sdk_1.createClient)(options);
                yield client.startClient({ initialSyncLimit: 10 });
                client.once("sync", 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                function (state, prevState, res) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (state === "PREPARED") {
                            const matrixRooms = client.getRooms();
                            setRooms(matrixRooms);
                            //printRooms(newRooms);
                        }
                        else {
                            console.log(state);
                        }
                    });
                });
                client.on("Room.timeline", 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                function (event, room, toStartOfTimeline) {
                    return __awaiter(this, void 0, void 0, function* () {
                        switch (event.getType()) {
                            case "m.room.message": {
                                setNewMessage(room.roomId, event.event.content.body);
                                console.log(`Room[${room.roomId}]: ${event.event.content.body}`);
                                break;
                            }
                            case "m.room.create": {
                                console.log(`m.room.create`, { roomId: room.roomId });
                                setSyncRoomId(room.roomId);
                                break;
                            }
                            case "m.room.name": {
                                console.log(`m.room.name`, {
                                    roomId: event.getRoomId(),
                                    name: event.getContent().name,
                                });
                                setRoomName(event.getRoomId(), event.getContent().name);
                                break;
                            }
                            case "m.room.member": {
                                console.log(`m.room.member`, {
                                    roomId: event.getRoomId(),
                                    content: event.getContent(),
                                });
                                setSyncRoomId(event.getRoomId());
                                const membership = event.getContent().membership;
                                if (membership) {
                                    setMembershipChanged(membership);
                                }
                                break;
                            }
                            default:
                                console.log(`Room.timeline event`, event.getType());
                                break;
                        }
                    });
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                client.on("RoomMember.membership", function (event, member) {
                    switch (member.membership) {
                        case matrix_types_1.Membership.Invite: {
                            if (member.userId === client.getUserId()) {
                                updateMembership(member.roomId, member.userId, matrix_types_1.Membership.Invite);
                            }
                            break;
                        }
                        case matrix_types_1.Membership.Join: {
                            setSyncRoomId(member.roomId);
                            break;
                        }
                        case matrix_types_1.Membership.Leave: {
                            if (member.userId === client.getUserId()) {
                                leaveRoom(member.roomId, member.userId);
                            }
                            break;
                        }
                        default: {
                            console.log(`RoomMember.membership event`, {
                                eventType: event.getType(),
                                userId: member.userId,
                                roomId: member.roomId,
                                membership: member.membership,
                            });
                            break;
                        }
                    }
                });
                matrixClientRef.current = client;
            }
        });
    }, [
        accessToken,
        homeServer,
        leaveRoom,
        setNewMessage,
        setRoomName,
        setRooms,
        updateMembership,
        userId,
    ]);
    (0, react_1.useEffect)(() => {
        if (isAuthenticated) {
            void (() => __awaiter(this, void 0, void 0, function* () { return yield startClient(); }))();
            console.log(`Matrix client listener started`);
        }
        else {
            if (matrixClientRef.current) {
                matrixClientRef.current.stopClient();
                matrixClientRef.current = undefined;
                console.log("Matrix client listener stopped");
            }
        }
    }, [isAuthenticated, startClient]);
}
exports.useMatrixClientListener = useMatrixClientListener;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printRooms(rooms) {
    let i = 0;
    for (const r of Object.values(rooms)) {
        console.log(`Room[${i++}] = { roomId: ${r.roomId}, name: "${r.name}", membership: ${r.membership} }`);
    }
}
