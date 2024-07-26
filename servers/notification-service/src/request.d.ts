// In a separate types file, e.g., types.d.ts
import { Logger } from 'winston'

declare global {
    namespace Express {
        interface Request {
            logger: Logger
        }
    }
}
