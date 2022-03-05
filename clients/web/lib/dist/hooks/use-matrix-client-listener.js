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
var SyncAction;
(function (SyncAction) {
    SyncAction["SyncAll"] = "SyncAll";
    SyncAction["SyncMyRoomMembership"] = "SyncMyRoomMembership";
})(SyncAction || (SyncAction = {}));
function useMatrixClientListener() {
    const { accessToken, homeServer, isAuthenticated, userId, createRoom, joinRoom, leaveRoom, setAllRooms, setNewMessage, setRoom, setRoomName, updateMembership, } = (0, store_1.useMatrixStore)();
    const matrixClientRef = (0, react_1.useRef)();
    const [syncInfo, setSyncInfo] = (0, react_1.useState)();
    (0, react_1.useEffect)(function () {
        if (matrixClientRef.current) {
            switch (syncInfo.action) {
                case SyncAction.SyncAll: {
                    console.log(`Sync all rooms`);
                    const rooms = matrixClientRef.current.getRooms();
                    printRooms(rooms);
                    setAllRooms(rooms);
                    break;
                }
                case SyncAction.SyncMyRoomMembership: {
                    const prop = syncInfo.props;
                    const room = matrixClientRef.current.getRoom(prop.roomId);
                    if (room) {
                        setRoom(room);
                    }
                    updateMembership(prop.roomId, prop.userId, prop.membership, prop.userId === matrixClientRef.current.getUserId());
                    break;
                }
                default: {
                    console.error(`Unsupported ${syncInfo.action}`);
                    break;
                }
            }
        }
    }, [syncInfo]);
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
                matrixClientRef.current = client;
                client.once("sync", 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                function (state, prevState, res) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (state === "PREPARED") {
                            setSyncInfo({ action: SyncAction.SyncAll }); // Create a new object to force sync.
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
                                console.log(`Room[${room.roomId}]: ${event.event.content.body}`);
                                setNewMessage(room.roomId, event.event.content.body);
                                break;
                            }
                            case "m.room.create": {
                                console.log(`m.room.create`, { roomId: room.roomId });
                                createRoom(room.roomId);
                                break;
                            }
                            case "m.room.name": {
                                const roomId = event.getRoomId();
                                const name = event.getContent().name;
                                console.log(`m.room.name`, {
                                    roomId,
                                    name,
                                });
                                setRoomName(roomId, name);
                                break;
                            }
                            case "m.room.member": {
                                const roomId = event.getRoomId();
                                const userId = event.getStateKey();
                                const membership = event.getContent().membership;
                                console.log(`m.room.member`, {
                                    roomId,
                                    userId,
                                    membership,
                                    content: event.getContent(),
                                    event: JSON.stringify(event),
                                });
                                if (roomId && userId && membership) {
                                    updateMembership(roomId, userId, membership, client.getUserId() === userId);
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
                    console.log(`RoomMember.membership event`, {
                        eventType: event.getType(),
                        userId: member.userId,
                        roomId: member.roomId,
                        membership: member.membership,
                    });
                    switch (member.membership) {
                        case matrix_types_1.Membership.Invite: {
                            setSyncInfo({
                                action: SyncAction.SyncMyRoomMembership,
                                props: {
                                    roomId: member.roomId,
                                    userId: member.userId,
                                    membership: member.membership,
                                },
                            });
                            break;
                        }
                        case matrix_types_1.Membership.Join: {
                            joinRoom(member.roomId, member.userId, member.userId === client.getUserId());
                            break;
                        }
                        case matrix_types_1.Membership.Leave: {
                            leaveRoom(member.roomId, member.userId, member.userId === client.getUserId());
                            break;
                        }
                        default:
                            break;
                    }
                });
            }
        });
    }, [
        accessToken,
        homeServer,
        leaveRoom,
        setNewMessage,
        setRoomName,
        setAllRooms,
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
    for (const r of rooms) {
        printRoom(r);
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printRoom(room) {
    if (room) {
        console.log(`Room[${room.roomId}] = { name: "${room.name}", membership: ${room.getMyMembership()} }`);
    }
    else {
        console.log(`"room" is undefined. Cannot print.`);
    }
}
