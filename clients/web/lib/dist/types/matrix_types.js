export var Membership;
(function (Membership) {
    Membership["Join"] = "join";
    Membership["Invite"] = "invite";
    Membership["Leave"] = "leave";
})(Membership || (Membership = {}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoom(room) {
    const r = room;
    return (r.roomId !== undefined &&
        r.name !== undefined &&
        r.members !== undefined &&
        r.membership !== undefined);
}
