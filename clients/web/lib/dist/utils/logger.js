"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
//import sourceMapSupport from "source-map-support";
require("./naughty_fish");
const usePino = typeof window !== "undefined" && process.env.NODE_ENV !== "development";
exports.logger = (() => {
    if (usePino) {
        const initalLoggers = {
            log: console.log,
        };
        const buffer = [];
        const write = (chunk) => {
            buffer.push(chunk);
            if (buffer.length > 250) {
                buffer.shift();
            }
        };
        const internalLogger = (0, pino_1.default)({ browser: { asObject: true, write } });
        function getLogger(level) {
            return (msg, ...args) => {
                const { stack } = new Error(); // captures the current call stack
                const splitStack = stack === null || stack === void 0 ? void 0 : stack.split("\n");
                splitStack === null || splitStack === void 0 ? void 0 : splitStack.shift();
                /*
                splitStack?.map(frame => {
                  debugger;
                  const sourcePos = frame.match(/.*\((.*)\)/)?.[1];
                  const [protocol, host, path, line, column] = sourcePos?.split(":") ?? [];
                  const url = new URL(protocol + host + path);
        
                  sourceMapSupport.mapSourcePosition({
                    source: url.pathname,
                    line: Number(line),
                    column: Number(column),
                  });
                });
                */
                args.push(splitStack);
                internalLogger[level](args, msg);
            };
        }
        const logger = {
            info: getLogger("info"),
            warn: getLogger("warn"),
            debug: getLogger("debug"),
            error: getLogger("error"),
        };
        console.log = logger.info;
        console.warn = logger.warn;
        console.error = logger.error;
        console.debug = logger.debug;
        window.dumpLogBuffer = () => {
            buffer.forEach((line) => initalLoggers.log(line));
        };
        return logger;
    }
    else {
        return {
            info: console.log,
            warn: console.warn,
            debug: console.debug,
            error: console.error,
        };
    }
})();
