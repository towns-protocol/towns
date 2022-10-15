"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: +(process.env.PORT ?? '80'),
    redisUrl: process.env.REDIS_URL ?? 'redis://default:redispw@localhost:55000',
    testRemoteUrl: process.env.TEST_REMOTE_URL,
};
