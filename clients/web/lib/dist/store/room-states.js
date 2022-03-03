"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRoom = exports.leaveRoom = exports.updateMembership = exports.setRoomName = exports.setAllRooms = exports.setRoom = exports.setNewMessage = exports.createRoom = void 0;
const matrix_types_1 = require("../types/matrix-types");
function createRoom(state, roomId) {
    const changedRooms = Object.assign({}, state.rooms);
    const newdRoom = {
        roomId,
        name: "",
        membership: null,
        members: {},
    };
    changedRooms[roomId] = newdRoom;
    return { rooms: changedRooms };
}
exports.createRoom = createRoom;
function setNewMessage(state, roomId, message) {
    const changedAllMessages = state.allMessages ? Object.assign({}, state.allMessages) : {};
    const changedRoomMessages = changedAllMessages[roomId]
        ? [...changedAllMessages[roomId]]
        : [];
    changedRoomMessages.push(message);
    changedAllMessages[roomId] = changedRoomMessages;
    return { allMessages: changedAllMessages };
}
exports.setNewMessage = setNewMessage;
function setRoom(state, room) {
    const changedRooms = Object.assign({}, state.rooms);
    const changedRoom = {
        roomId: room.roomId,
        name: room.name,
        membership: room.getMyMembership(),
        inviter: room.getMyMembership() === matrix_types_1.Membership.Invite
            ? room.guessDMUserId()
            : undefined,
        members: {},
    };
    const members = room.getMembersWithMembership(matrix_types_1.Membership.Join);
    for (const m of members) {
        changedRoom.members[m.userId] = {
            userId: m.userId,
            name: m.name,
            membership: matrix_types_1.Membership.Join,
        };
    }
    changedRooms[room.roomId] = changedRoom;
    console.log(`setRoom changedRooms`, {
        roomId: changedRoom.roomId,
        name: changedRoom.name,
        membership: changedRoom.membership,
    });
    return { rooms: changedRooms };
}
exports.setRoom = setRoom;
function setAllRooms(state, matrixRooms) {
    const changedRooms = {};
    for (const r of matrixRooms) {
        console.log(`matrixRoom[${r.roomId}]`, { name: r.name });
        changedRooms[r.roomId] = {
            roomId: r.roomId,
            name: r.name,
            membership: r.getMyMembership(),
            inviter: r.getMyMembership() === matrix_types_1.Membership.Invite
                ? r.guessDMUserId()
                : undefined,
            members: {},
        };
        const members = r.getMembersWithMembership(matrix_types_1.Membership.Join);
        for (const m of members) {
            changedRooms[r.roomId].members[m.userId] = {
                userId: m.userId,
                name: m.name,
                membership: matrix_types_1.Membership.Join,
            };
        }
        console.log(`setAllRooms changedRooms`, {
            roomId: changedRooms[r.roomId].roomId,
            name: changedRooms[r.roomId].name,
            membership: changedRooms[r.roomId].membership,
        });
    }
    return { rooms: changedRooms };
}
exports.setAllRooms = setAllRooms;
function setRoomName(state, roomId, newName) {
    var _a;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room && room.name !== newName) {
        const changedRoom = Object.assign({}, room);
        changedRoom.name = newName;
        const changedRooms = Object.assign({}, state.rooms);
        changedRooms[roomId] = changedRoom;
        console.log(`setRoomName ${JSON.stringify(changedRoom)}`);
        return { rooms: changedRooms };
    }
    console.log(`setRoomName no op`);
    return state;
}
exports.setRoomName = setRoomName;
function updateMembership(state, roomId, userId, membership, isMyRoomMembership) {
    var _a, _b;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room) {
        const member = (_b = room.members[userId]) !== null && _b !== void 0 ? _b : { membership: null };
        if (member.membership !== membership) {
            const changedRooms = Object.assign({}, state.rooms);
            const changedRoom = Object.assign({}, room);
            if (isMyRoomMembership) {
                changedRoom.membership = membership;
            }
            const changedMember = Object.assign({}, changedRoom.members[userId]);
            changedMember.membership = membership;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            console.log(`updateMembership ${JSON.stringify(changedRoom)}`);
            return { rooms: changedRooms };
        }
    }
    console.log(`updateMembership no op`);
    return state;
}
exports.updateMembership = updateMembership;
function leaveRoom(state, roomId, userId, isMyRoomMembership) {
    var _a;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== matrix_types_1.Membership.Leave) {
            const changedRooms = Object.assign({}, state.rooms);
            const changedRoom = Object.assign({}, room);
            const changedMember = Object.assign({}, changedRoom.members[userId]);
            changedMember.membership = matrix_types_1.Membership.Leave;
            if (isMyRoomMembership) {
                changedRoom.membership = matrix_types_1.Membership.Leave;
            }
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            return { rooms: changedRooms };
        }
    }
    console.log(`leaveRoom no op`);
    return state;
}
exports.leaveRoom = leaveRoom;
function joinRoom(state, roomId, userId, isMyRoomMembership) {
    var _a;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== matrix_types_1.Membership.Join) {
            const changedRooms = Object.assign({}, state.rooms);
            const changedRoom = Object.assign({}, room);
            const changedMember = Object.assign({}, changedRoom.members[userId]);
            changedMember.membership = matrix_types_1.Membership.Join;
            if (isMyRoomMembership) {
                changedRoom.membership = matrix_types_1.Membership.Join;
            }
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            return { rooms: changedRooms };
        }
    }
    console.log(`joinRoom no op`);
    return state;
}
exports.joinRoom = joinRoom;
