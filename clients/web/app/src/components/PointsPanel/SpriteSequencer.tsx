type Frame = { x: number; y: number; w: number; h: number }

type SpriteData<K extends string> = {
    meta: {
        image: string
        size: { w: number; h: number }
        scale: string
    }
    frames: Record<
        K,
        {
            frame: Frame
            rotated: boolean
            trimmed: boolean
            spriteSourceSize: { x: number; y: number; w: number; h: number }
            sourceSize: { w: number; h: number }
        }
    >
}

enum Direction {
    Forward = 1,
    Reverse = -1,
}

type PlayOptions = {
    direction: Direction
    startFrame: number
}

type SingleDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

type ExtractPrefix<T extends string> =
    T extends `${infer Prefix}_${SingleDigit}${SingleDigit}${SingleDigit}.png`
        ? Prefix
        : T extends `${infer Prefix}_${SingleDigit}${SingleDigit}.png`
        ? Prefix
        : T extends `${infer Prefix}_${SingleDigit}.png`
        ? Prefix
        : never

export class SpriteSequencer<K extends string, L extends ExtractPrefix<K>> {
    private sheet: HTMLImageElement
    private data: SpriteData<K>
    private loops: Record<L, { frames: Frame[] }>
    private frame: Frame
    private playHead: {
        loop: L
        frame: number
        sequence: { loop: L; playOptions: Partial<PlayOptions> }[]
        playOptions: PlayOptions
    }

    public names: string[]

    constructor(src: string, data: SpriteData<K>, canvas?: HTMLCanvasElement) {
        this.data = data

        this.sheet = new Image()
        this.sheet.src = src

        this.loops = (Object.keys(data.frames) as K[]).reduce((acc, frame) => {
            const l = frame.split(/_[0-9]{1,3}/)[0]
            acc[l] = acc[l] ?? { name: l, frames: [] }
            acc[l].frames.push(data.frames[frame].frame)
            return acc
        }, {} as Record<string, { name: L; frames: Frame[] }>)

        this.names = Object.keys(this.loops)
        this.playHead = {
            loop: this.names[0] as L,
            frame: 0,
            sequence: [],
            playOptions: {
                direction: Direction.Forward,
                startFrame: 0,
            },
        }

        this.frame = this.loops[this.playHead.loop].frames[this.playHead.frame]
    }

    public play(loop: L, options: Partial<PlayOptions> = {}) {
        this.playHead.loop = loop
        this.playHead.playOptions = {
            direction: options.direction ?? Direction.Forward,
            startFrame: options.startFrame ?? 0,
        }
        this.playHead.frame = this.playHead.playOptions.startFrame
        this.playHead.sequence = []

        return this
    }

    public clear() {
        this.playHead.sequence = []
        return this
    }

    public append(loop: L, options: Partial<PlayOptions> = {}) {
        this.playHead.sequence.push({
            loop,
            playOptions: {
                ...options,
            },
        })

        return this
    }

    reverse() {
        const last = this.playHead.sequence.at(this.playHead.sequence.length - 1)
        if (last) {
            last.playOptions.direction = Direction.Reverse
            last.playOptions.startFrame = this.loops[last.loop].frames.length - 1
        }
        return this
    }

    public draw(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d')
        if (!context) {
            return
        }

        context.clearRect(0, 0, canvas.width, canvas.height)

        context.drawImage(
            this.sheet,
            this.frame.x,
            this.frame.y,
            this.frame.w,
            this.frame.h,
            0,
            0,
            canvas.width,
            canvas.height,
        )
    }

    public get currentLoop() {
        return this.playHead.loop
    }

    public tick() {
        this.playHead.frame += this.playHead.playOptions.direction

        const endFrame: boolean =
            this.playHead.playOptions.direction === Direction.Forward
                ? this.playHead.frame >= this.loops[this.playHead.loop].frames.length
                : this.playHead.frame < 0

        if (endFrame) {
            const next = this.playHead.sequence.shift()
            if (next) {
                this.playHead.frame =
                    next.playOptions.startFrame ??
                    (this.playHead.playOptions.direction === Direction.Forward
                        ? 0
                        : this.loops[next.loop].frames.length - 1)
                this.playHead.loop = next.loop
                this.playHead.playOptions = {
                    ...next.playOptions,
                    direction: next.playOptions.direction ?? Direction.Forward,
                    startFrame:
                        next.playOptions.startFrame ??
                        (this.playHead.playOptions.direction === Direction.Forward
                            ? 0
                            : this.loops[next.loop].frames.length - 1),
                }
            } else {
                this.playHead.frame = 0
            }
        }

        const frameData = this.loops[this.playHead.loop].frames[this.playHead.frame]
        this.frame = frameData
    }
}
