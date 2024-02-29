import { Request as IttyRequest, Router } from 'itty-router'
import { Env } from '.'

const router = Router()

type WorkerRequest = Request & IttyRequest

// todo: implement /register here
// https://linear.app/hnt-labs/issue/HNT-2214/add-register-endpoints-to-jwt-worker
router.post('/register', async () => new Response('Ok', { status: 200 }))

router.post('/')

router.get('*', () => new Response('Not Found', { status: 404 }))

export const handleRequest = (request: WorkerRequest, env: Env) => router.handle(request, env)
