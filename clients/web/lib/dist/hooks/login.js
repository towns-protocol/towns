"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsernamePart = exports.LogInStatus = void 0;
var LogInStatus;
(function (LogInStatus) {
    LogInStatus["LoggedIn"] = "LoggedIn";
    LogInStatus["LoggingIn"] = "LoggingIn";
    LogInStatus["LoggingOut"] = "LoggingOut";
    LogInStatus["LoggedOut"] = "LoggedOut";
})(LogInStatus = exports.LogInStatus || (exports.LogInStatus = {}));
function getUsernamePart(userId) {
    var _a, _b;
    if (userId) {
        const regexName = /^@(?<name>\w+):/;
        const match = regexName.exec(userId);
        const username = (_b = (_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : undefined;
        return username;
    }
    return undefined;
}
exports.getUsernamePart = getUsernamePart;
