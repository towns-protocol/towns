"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DumbActionGuard = void 0;
const debug_1 = __importDefault(require("debug"));
const log_action = (0, debug_1.default)('zion:action_guard');
class DumbActionGuard {
    async isAllowed(actor, action, object) {
        log_action('DumbActionGuard', actor, action, object);
        return true;
    }
}
exports.DumbActionGuard = DumbActionGuard;
