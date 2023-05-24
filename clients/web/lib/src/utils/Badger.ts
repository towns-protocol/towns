export class Badger {
    private static _faviconSingleton?: Badger | undefined
    static faviconSingleton(): Badger {
        if (!Badger._faviconSingleton) {
            Badger._faviconSingleton = new Badger()
        }
        return Badger._faviconSingleton
    }

    private backgroundColor: string
    private liteBackgroundColor: string
    private color: string
    private scale: number
    private liteScale: number
    private src: string | null
    private canvas: HTMLCanvasElement | null
    private faviconEL: HTMLLinkElement | null
    private ctx: CanvasRenderingContext2D | null

    private faviconSize = 0
    private _value = 0
    private _showDot = false
    private img?: HTMLImageElement

    constructor(
        backgroundColor = '#1FDBF1',
        liteBackgroundColor = '#1FDBF1',
        color = '#fff',
        scale = 0.6, // 0..1 (Scale in respect to the favicon image size)
        liteScale = 0.4, // 0..1 (Scale in respect to the favicon image size)
        src: string | null = null, // Favicon source (dafaults to the <link> icon href)
    ) {
        this.backgroundColor = backgroundColor
        this.liteBackgroundColor = liteBackgroundColor
        this.color = color
        this.scale = scale
        this.liteScale = liteScale
        if (document) {
            this.canvas = document.createElement('canvas')
            this.faviconEL = document.querySelector('link[rel$=icon]')
            if (!this.faviconEL) {
                const url = this.canvas.toDataURL('image/png')
                const elm = document.createElement('link')
                elm.setAttribute('rel', 'icon')
                elm.setAttribute('type', 'image/png')
                elm.setAttribute('href', url)
                const head = document.querySelector('head')
                if (head) {
                    head.appendChild(elm)
                    this.faviconEL = elm
                }
            }
            this.src = src ?? this.faviconEL?.getAttribute('href') ?? null
            this.ctx = this.canvas.getContext('2d')
        } else {
            this.canvas = null
            this.src = null
            this.faviconEL = null
            this.ctx = null
        }
    }

    _drawIcon() {
        if (!this.img || !this.ctx) {
            return
        }
        this.ctx.clearRect(0, 0, this.faviconSize, this.faviconSize)
        this.ctx.drawImage(this.img, 0, 0, this.faviconSize, this.faviconSize)
    }

    _drawShape() {
        if (!this.ctx) {
            return
        }
        const opt = {
            w: this.faviconSize * this.scale,
            h: this.faviconSize * this.scale,
            x: this.faviconSize * (1 - this.scale),
            y: this.faviconSize * (1 - this.scale),
        }
        const numDigits = this.value.toString().length
        if (numDigits === 2) {
            opt.x = opt.x - opt.w * 0.4
            opt.w = opt.w * 1.4
        } else if (numDigits >= 3) {
            opt.x = opt.x - opt.w * 0.65
            opt.w = opt.w * 1.65
        }

        this.ctx.beginPath()

        if (numDigits === 1) {
            this.ctx.arc(opt.x + opt.w / 2, opt.y + opt.h / 2, opt.h / 2, 0, 2 * Math.PI)
        } else {
            this.ctx.moveTo(opt.x + opt.w / 2, opt.y)
            this.ctx.lineTo(opt.x + opt.w - opt.h / 2, opt.y)
            this.ctx.quadraticCurveTo(opt.x + opt.w, opt.y, opt.x + opt.w, opt.y + opt.h / 2)
            this.ctx.lineTo(opt.x + opt.w, opt.y + opt.h - opt.h / 2)
            this.ctx.quadraticCurveTo(
                opt.x + opt.w,
                opt.y + opt.h,
                opt.x + opt.w - opt.h / 2,
                opt.y + opt.h,
            )
            this.ctx.lineTo(opt.x + opt.h / 2, opt.y + opt.h)
            this.ctx.quadraticCurveTo(opt.x, opt.y + opt.h, opt.x, opt.y + opt.h - opt.h / 2)
            this.ctx.lineTo(opt.x, opt.y + opt.h / 2)
            this.ctx.quadraticCurveTo(opt.x, opt.y, opt.x + opt.h / 2, opt.y)
        }
        this.ctx.fillStyle = this.backgroundColor
        this.ctx.fill()
        this.ctx.closePath()
        // Draw text
        this.ctx.beginPath()
        this.ctx.stroke()
        this.ctx.textAlign = 'center'
        this.ctx.font = `bold ${Math.floor(opt.h * (this.value > 99 ? 0.85 : 1))}px sans-serif`
        this.ctx.fillStyle = this.color
        if (this.value > 99) {
            this.ctx.fillText(
                this.value > 9999
                    ? '9k+'
                    : this.value > 999
                    ? Math.floor(this.value / 1000).toString() + 'k+'
                    : '99+',
                Math.floor(opt.x + opt.w / 2),
                Math.floor(opt.y + opt.h - opt.h * 0.2),
            )
        } else {
            this.ctx.fillText(
                this.value.toString(),
                Math.floor(opt.x + opt.w / 2),
                Math.floor(opt.y + opt.h - opt.h * 0.15),
            )
        }
        this.ctx.closePath()
    }

    _drawLiteShape() {
        if (!this.ctx) {
            return
        }
        const opt = {
            w: this.faviconSize * this.liteScale,
            h: this.faviconSize * this.liteScale,
            x: this.faviconSize * (1 - this.liteScale),
            y: this.faviconSize * (1 - this.liteScale),
        }
        const fillCorner = true
        const TopLeft = { x: opt.x, y: opt.y }
        const TopRight = { x: opt.x + opt.w, y: opt.y }
        const BottomLeft = { x: opt.x, y: opt.y + opt.h }
        const BottomRight = { x: opt.x + opt.w, y: opt.y + opt.h }
        const Top = { x: opt.x + opt.w / 2, y: opt.y }
        const Bottom = { x: opt.x + opt.w / 2, y: opt.y + opt.h }
        const Left = { x: opt.x, y: opt.y + opt.h / 2 }
        const Right = { x: opt.x + opt.w, y: opt.y + opt.h / 2 }
        this.ctx.beginPath()
        this.ctx.moveTo(Top.x, Top.y)
        this.ctx.quadraticCurveTo(TopRight.x, TopRight.y, Right.x, Right.y)
        if (fillCorner) {
            this.ctx.lineTo(BottomRight.x, BottomRight.y) // fill in the bottom right corner
            this.ctx.lineTo(Bottom.x, Bottom.y) // fill in the bottom right corner
        } else {
            this.ctx.quadraticCurveTo(BottomRight.x, BottomRight.y, Bottom.x, Bottom.y)
        }
        this.ctx.quadraticCurveTo(BottomLeft.x, BottomLeft.y, Left.x, Left.y)
        this.ctx.quadraticCurveTo(TopLeft.x, TopLeft.y, Top.x, Top.y)
        this.ctx.fillStyle = this.liteBackgroundColor
        this.ctx.fill()
        this.ctx.closePath()
    }

    _drawFavicon() {
        if (!this.faviconEL || !this.canvas) {
            return
        }
        const url = this.canvas.toDataURL('image/png')
        if (url) {
            this.faviconEL.setAttribute('href', url)
        }
    }

    _draw() {
        this._drawIcon()
        if (this.value) {
            this._drawShape()
        } else if (this._showDot) {
            this._drawLiteShape()
        }
        this._drawFavicon()
    }

    _setup() {
        if (!this.canvas) {
            return
        }
        this.faviconSize = this.img?.naturalWidth ?? 0
        this.canvas.width = this.faviconSize
        this.canvas.height = this.faviconSize
    }

    // Public functions / methods:

    _update() {
        if (this.img) {
            this._draw()
        } else if (this.src) {
            this.img = new Image()
            this.img.setAttribute('crossOrigin', 'anonymous')
            this.img.addEventListener('load', () => {
                this._setup()
                this._draw()
            })
            this.img.src = this.src
        }
    }

    get value() {
        return this._value
    }

    badge(mentionCount: number, hasUnread: boolean) {
        if (mentionCount === this._value && hasUnread === this._showDot) {
            return
        }
        this._value = mentionCount
        this._showDot = hasUnread
        this._update()
    }
}
