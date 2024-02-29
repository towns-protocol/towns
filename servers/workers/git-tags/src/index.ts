import { z } from 'zod'
import { TagsUrl } from './const'

const tags = z.array(
    z.object({
        name: z.string(),
        commit: z.object({
            sha: z.string(),
        }),
    }),
)

export interface Env {
    GITHUB_TOKEN: string
}

const handler: ExportedHandler<Env> = {
    async fetch(request, env, ctx): Promise<Response> {
        try {
            const url = new URL(request.url)
            if (url.pathname == '/status') {
                return new Response('OK', { status: 200 })
            }
            const requestInit = {
                method: 'GET',
                headers: {
                    'User-Agent': 'HereNotThere',
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            } as const
            const resp = await fetch(TagsUrl, requestInit)
            if (resp.status === 401) {
                return new Response(resp.statusText, {
                    status: resp.status,
                    headers: resp.headers,
                })
            }

            const json = await resp.json()
            const tag = tags.parse(json)
            const hashToTagMap = tag.reduce((sha, tag) => {
                const shaTag = sha[tag.commit.sha]
                sha[tag.commit.sha] = shaTag ? [...sha[tag.commit.sha], tag.name] : [tag.name]
                return sha
            }, {} as Record<string, string[]>)
            const sha = new URL(request.url).searchParams.get('sha')
            if (sha) {
                const tag = hashToTagMap[sha]
                if (!tag) {
                    return new Response('sha not found', {
                        status: 400,
                        headers: { 'content-type': 'text/json' },
                    })
                }
                return new Response(JSON.stringify({ tag }), {
                    status: 200,
                    headers: { 'content-type': 'text/json' },
                })
            } else {
                return new Response('sha param not found', { status: 400 })
            }
        } catch (e) {
            console.error(`error`, e)
            return new Response('Internal Server Error', {
                status: 500,
            })
        }
    },
}
export default handler
