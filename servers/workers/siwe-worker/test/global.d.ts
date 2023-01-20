import { Env } from '../src'

declare global {
	function getMiniflareBindings(): Env
}
