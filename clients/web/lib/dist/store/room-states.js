"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRoom = exports.leaveRoom = exports.updateMembership = exports.setRoomName = exports.setAllRooms = exports.setRoom = exports.setNewMessage = void 0;
const matrix_types_1 = require("../types/matrix-types");
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
    console.log(`setRoom ${JSON.stringify(changedRoom)}`);
    changedRooms[room.roomId] = changedRoom;
    for (const r of Object.values(changedRooms)) {
        console.log(`setRoom changedRooms`, {
            roomId: r.roomId,
            membership: r.membership,
        });
    }
    return { rooms: changedRooms };
}
exports.setRoom = setRoom;
function setAllRooms(state, matrixRooms) {
    const changedRooms = {};
    for (const r of matrixRooms) {
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
    }
    console.log(`setAllRooms`);
    for (const r of Object.values(changedRooms)) {
        console.log(`setAllRooms changedRooms`, {
            roomId: r.roomId,
            membership: r.membership,
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
    return state;
}
exports.setRoomName = setRoomName;
function updateMembership(state, roomId, userId, membership) {
    var _a;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== membership) {
            const changedRooms = Object.assign({}, state.rooms);
            const changedRoom = Object.assign({}, room);
            const changedMember = Object.assign({}, changedRoom.members[userId]);
            changedMember.membership = membership;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            console.log(`updateMember ${JSON.stringify(changedRoom)}`);
            return { rooms: changedRooms };
        }
    }
    return state;
}
exports.updateMembership = updateMembership;
function leaveRoom(state, roomId, userId) {
    var _a;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== matrix_types_1.Membership.Leave) {
            const changedRooms = Object.assign({}, state.rooms);
            const changedRoom = Object.assign({}, room);
            const changedMember = Object.assign({}, changedRoom.members[userId]);
            changedMember.membership = matrix_types_1.Membership.Leave;
            changedRoom.membership = matrix_types_1.Membership.Leave;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            return { rooms: changedRooms };
        }
    }
    return state;
}
exports.leaveRoom = leaveRoom;
function joinRoom(state, roomId, userId) {
    var _a;
    const room = (_a = state.rooms) === null || _a === void 0 ? void 0 : _a[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== matrix_types_1.Membership.Leave) {
            const changedRooms = Object.assign({}, state.rooms);
            const changedRoom = Object.assign({}, room);
            const changedMember = Object.assign({}, changedRoom.members[userId]);
            changedMember.membership = matrix_types_1.Membership.Leave;
            changedRoom.membership = matrix_types_1.Membership.Leave;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            return { rooms: changedRooms };
        }
    }
    return state;
}
exports.joinRoom = joinRoom;
