import { Env } from '../src'
import { MockAgent } from 'undici'

declare global {
    function getMiniflareBindings(): Env
    function getMiniflareFetchMock(): MockAgent
}
