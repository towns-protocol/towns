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
const use_credential_store_1 = require("../store/use-credential-store");
const use_matrix_store_1 = require("../store/use-matrix-store");
function useMatrixClientListener(homeServerUrl, initialSyncLimit = 20) {
    const { homeServer, isAuthenticated, userId, setHomeServer } = (0, use_matrix_store_1.useMatrixStore)();
    const { accessToken } = (0, use_credential_store_1.useCredentialStore)();
    const matrixClientRef = (0, react_1.useRef)();
    const handleRoomEvent = useRoomEventHandler();
    const handleRoomMembershipEvent = useRoomMembershipEventHandler(matrixClientRef);
    const handleRoomTimelineEvent = useRoomTimelineEventHandler(matrixClientRef);
    const handleSync = useSync(matrixClientRef);
    (0, react_1.useEffect)(function () {
        setHomeServer(homeServerUrl);
    }, []);
    const startClient = (0, react_1.useCallback)(function () {
        return __awaiter(this, void 0, void 0, function* () {
            if (accessToken && homeServer && userId) {
                const options = {
                    baseUrl: homeServer,
                    accessToken: accessToken,
                    userId: userId,
                };
                const client = (0, matrix_js_sdk_1.createClient)(options);
                yield client.startClient({ initialSyncLimit });
                matrixClientRef.current = client;
                client.once("sync", 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                function (state, prevState, res) {
                    if (state === "PREPARED") {
                        handleSync();
                    }
                    else {
                        console.log(state);
                    }
                });
                client.on("Room.timeline", 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                function (event, room, toStartOfTimeline) {
                    handleRoomTimelineEvent(event, room, toStartOfTimeline);
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                client.on("RoomMember.membership", function (event, member) {
                    handleRoomMembershipEvent(event, member);
                });
                client.on("Room", function (room) {
                    handleRoomEvent(room);
                });
            }
        });
    }, [accessToken, homeServer, initialSyncLimit, userId]);
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
    return {
        matrixClient: matrixClientRef.current,
    };
}
exports.useMatrixClientListener = useMatrixClientListener;
function printRooms(rooms) {
    for (const r of rooms) {
        printRoom(r);
    }
}
function printRoom(room) {
    if (room) {
        console.log(`Room[${room.roomId}] = { name: "${room.name}", membership: ${room.getMyMembership()} }`);
    }
    else {
        console.log(`"room" is undefined. Cannot print.`);
    }
}
function useSync(matrixClientRef) {
    const [syncInfo, setSyncInfo] = (0, react_1.useState)();
    const { setAllRooms } = (0, use_matrix_store_1.useMatrixStore)();
    (0, react_1.useEffect)(function () {
        if (matrixClientRef.current) {
            console.log(`Sync all rooms`);
            const rooms = matrixClientRef.current.getRooms();
            printRooms(rooms);
            setAllRooms(rooms);
        }
    }, [syncInfo]);
    const handleSyncAll = (0, react_1.useCallback)(function () {
        // Force a sync by mutating the state.
        setSyncInfo({});
    }, []);
    return handleSyncAll;
}
function useRoomMembershipEventHandler(matrixClientRef) {
    const { joinRoom, leaveRoom, setRoom, updateMembership } = (0, use_matrix_store_1.useMatrixStore)();
    const [syncInfo, setSyncInfo] = (0, react_1.useState)();
    (0, react_1.useEffect)(function () {
        if (matrixClientRef.current) {
            const room = matrixClientRef.current.getRoom(syncInfo.roomId);
            if (room) {
                setRoom(room);
            }
            updateMembership(syncInfo.roomId, syncInfo.userId, syncInfo.membership, syncInfo.userId === matrixClientRef.current.getUserId());
        }
    }, [syncInfo]);
    const handleRoomMembershipEvent = (0, react_1.useCallback)(function (event, member) {
        console.log(`RoomMember.membership event`, {
            eventType: event.getType(),
            userId: member.userId,
            roomId: member.roomId,
            membership: member.membership,
        });
        switch (member.membership) {
            case matrix_types_1.Membership.Invite: {
                setSyncInfo({
                    roomId: member.roomId,
                    userId: member.userId,
                    membership: member.membership,
                });
                break;
            }
            case matrix_types_1.Membership.Join: {
                joinRoom(member.roomId, member.userId, member.userId === matrixClientRef.current.getUserId());
                break;
            }
            case matrix_types_1.Membership.Leave: {
                leaveRoom(member.roomId, member.userId, member.userId === matrixClientRef.current.getUserId());
                break;
            }
            default:
                break;
        }
    }, []);
    return handleRoomMembershipEvent;
}
function useRoomTimelineEventHandler(matrixClientRef) {
    const { createRoom, setNewMessage, setRoomName, updateMembership } = (0, use_matrix_store_1.useMatrixStore)();
    const handleRoomeTimelineEvent = (0, react_1.useCallback)(function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    room, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    toStartOfTimeline) {
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
                    updateMembership(roomId, userId, membership, matrixClientRef.current.getUserId() === userId);
                }
                break;
            }
            default:
                console.log(`Room.timeline event`, event.getType());
                break;
        }
    }, []);
    return handleRoomeTimelineEvent;
}
function useRoomEventHandler() {
    const handleRoomEvent = (0, react_1.useCallback)(function (room) {
        console.log("Room.event", {
            roomId: room.roomId,
            name: room.name,
        });
    }, []);
    return handleRoomEvent;
}
