import pino from "pino";
//import sourceMapSupport from "source-map-support";
import "./naughty_fish";
const usePino =
  typeof window !== "undefined" && process.env.NODE_ENV !== "development";

interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}
export const logger: Logger = (() => {
  if (usePino) {
    const initalLoggers = {
      log: console.log,
    };

    const buffer: object[] = [];
    const write = (chunk: object) => {
      buffer.push(chunk);
      if (buffer.length > 250) {
        buffer.shift();
      }
    };
    const internalLogger = pino({ browser: { asObject: true, write } });
    function getLogger(level: pino.Level) {
      return (msg: string, ...args: unknown[]) => {
        const { stack } = new Error(); // captures the current call stack
        const splitStack = stack?.split("\n");
        splitStack?.shift();
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
  } else {
    return {
      info: console.log,
      warn: console.warn,
      debug: console.debug,
      error: console.error,
    };
  }
})();
