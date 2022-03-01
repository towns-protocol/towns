import { Membership } from "../types/matrix_types";
export function setNewMessage(state, roomId, message) {
    const changedAllMessages = state.allMessages ? { ...state.allMessages } : {};
    const changedRoomMessages = changedAllMessages[roomId]
        ? [...changedAllMessages[roomId]]
        : [];
    changedRoomMessages.push(message);
    changedAllMessages[roomId] = changedRoomMessages;
    return { allMessages: changedAllMessages };
}
export function setRoom(state, room) {
    const changedRooms = { ...state.rooms };
    const changedRoom = {
        roomId: room.roomId,
        name: room.name,
        membership: room.getMyMembership(),
        inviter: room.getMyMembership() === Membership.Invite
            ? room.guessDMUserId()
            : undefined,
        members: {},
    };
    const members = room.getMembersWithMembership(Membership.Join);
    for (const m of members) {
        changedRoom.members[m.userId] = {
            userId: m.userId,
            name: m.name,
            membership: Membership.Join,
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
export function setAllRooms(state, matrixRooms) {
    const changedRooms = {};
    for (const r of matrixRooms) {
        changedRooms[r.roomId] = {
            roomId: r.roomId,
            name: r.name,
            membership: r.getMyMembership(),
            inviter: r.getMyMembership() === Membership.Invite
                ? r.guessDMUserId()
                : undefined,
            members: {},
        };
        const members = r.getMembersWithMembership(Membership.Join);
        for (const m of members) {
            changedRooms[r.roomId].members[m.userId] = {
                userId: m.userId,
                name: m.name,
                membership: Membership.Join,
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
export function setRoomName(state, roomId, newName) {
    const room = state.rooms?.[roomId];
    if (room && room.name !== newName) {
        const changedRoom = { ...room };
        changedRoom.name = newName;
        const changedRooms = { ...state.rooms };
        changedRooms[roomId] = changedRoom;
        console.log(`setRoomName ${JSON.stringify(changedRoom)}`);
        return { rooms: changedRooms };
    }
    return state;
}
export function updateMembership(state, roomId, userId, membership) {
    const room = state.rooms?.[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== membership) {
            const changedRooms = { ...state.rooms };
            const changedRoom = { ...room };
            const changedMember = { ...changedRoom.members[userId] };
            changedMember.membership = membership;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            console.log(`updateMember ${JSON.stringify(changedRoom)}`);
            return { rooms: changedRooms };
        }
    }
    return state;
}
export function leaveRoom(state, roomId, userId) {
    const room = state.rooms?.[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== Membership.Leave) {
            const changedRooms = { ...state.rooms };
            const changedRoom = { ...room };
            const changedMember = { ...changedRoom.members[userId] };
            changedMember.membership = Membership.Leave;
            changedRoom.membership = Membership.Leave;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            return { rooms: changedRooms };
        }
    }
    return state;
}
export function joinRoom(state, roomId, userId) {
    const room = state.rooms?.[roomId];
    if (room) {
        const member = room.members[userId];
        if (member && member.membership !== Membership.Leave) {
            const changedRooms = { ...state.rooms };
            const changedRoom = { ...room };
            const changedMember = { ...changedRoom.members[userId] };
            changedMember.membership = Membership.Leave;
            changedRoom.membership = Membership.Leave;
            changedRoom.members[userId] = changedMember;
            changedRooms[roomId] = changedRoom;
            return { rooms: changedRooms };
        }
    }
    return state;
}
