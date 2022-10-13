export class Badger {
    private static _faviconSingleton?: Badger | undefined
    static faviconSingleton(): Badger {
        if (!Badger._faviconSingleton) {
            Badger._faviconSingleton = new Badger()
        }
        return Badger._faviconSingleton
    }

    private backgroundColor: string
    private color: string
    private scale: number
    private src: string | null
    private canvas: HTMLCanvasElement | null
    private faviconEL: HTMLLinkElement | null
    private ctx: CanvasRenderingContext2D | null

    private faviconSize = 0
    private _value = 0
    private img?: HTMLImageElement

    constructor(
        backgroundColor = '#d00',
        color = '#fff',
        scale = 0.6, // 0..1 (Scale in respect to the favicon image size)
        src: string | null = null, // Favicon source (dafaults to the <link> icon href)
    ) {
        this.backgroundColor = backgroundColor
        this.color = color
        this.scale = scale
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
        if (this.value) this._drawShape()
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

    update() {
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

    badge(val: number) {
        if (val !== this._value) {
            this._value = val
            this.update()
        }
    }
}
