"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRoom = exports.Membership = exports.Visibility = void 0;
var Visibility;
(function (Visibility) {
    Visibility["Private"] = "private";
    Visibility["Public"] = "public";
})(Visibility = exports.Visibility || (exports.Visibility = {}));
var Membership;
(function (Membership) {
    Membership["Join"] = "join";
    Membership["Invite"] = "invite";
    Membership["Leave"] = "leave";
})(Membership = exports.Membership || (exports.Membership = {}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRoom(room) {
    const r = room;
    return (r.roomId !== undefined &&
        r.name !== undefined &&
        r.members !== undefined &&
        r.membership !== undefined);
}
exports.isRoom = isRoom;
