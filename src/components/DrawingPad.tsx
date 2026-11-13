import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 쪽 위에 얹는 손그림. 사진으로 올리지 않고 "어떤 선을 그었나"만 작게 저장한다.
// 좌표·굵기는 그림판 가로 길이를 1000으로 본 값이라, 어떤 크기의 쪽에서도 같은 모양으로 보인다.
export type Stroke = {
    c: string        // 색
    w: number        // 굵기 (가로 1000 기준)
    e?: 1            // 1이면 지우개 선
    p: number[]      // x0,y0,x1,y1,... (가로 1000 기준, 정수)
}
export type Drawing = {
    a: number        // 가로÷세로 비율
    s: Stroke[]
}

const MAX_JSON = 200_000 // 쪽마다 약 200KB까지만 (무료 한도 보호)

export function readDrawing(textLayers: unknown): Drawing | null {
    try {
        const tl = typeof textLayers === 'string' ? JSON.parse(textLayers) : textLayers
        const d = (tl as { drawing?: Drawing } | null)?.drawing
        if (d && typeof d.a === 'number' && Array.isArray(d.s) && d.s.length) return d
    } catch { /* 깨진 값은 그림 없음으로 본다 */ }
    return null
}

// 쪽 데이터에서 그림 말고 나머지를 그대로 둔 채 그림만 바꾼 새 text_layers 를 만든다
export function withDrawing(textLayers: unknown, drawing: Drawing | null): Record<string, unknown> {
    let base: unknown = textLayers
    if (typeof base === 'string') { try { base = JSON.parse(base) } catch { base = {} } }
    const obj: Record<string, unknown> = base && typeof base === 'object' && !Array.isArray(base) ? { ...(base as Record<string, unknown>) } : {}
    // 그림을 지운 경우에도 키를 남겨(null) "일부러 지웠다"는 걸 에디터가 구분하게 한다
    obj.drawing = drawing && drawing.s.length ? drawing : null
    return obj
}

const BACK_W = 900

function paint(canvas: HTMLCanvasElement, drawing: Drawing | null) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height, k = W / 1000
    ctx.clearRect(0, 0, W, H)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of drawing?.s ?? []) {
        ctx.globalCompositeOperation = s.e ? 'destination-out' : 'source-over'
        ctx.strokeStyle = s.c
        ctx.fillStyle = s.c
        ctx.lineWidth = s.w * k
        const p = s.p
        if (p.length < 4) { // 점 하나
            ctx.beginPath(); ctx.arc(p[0] * k, p[1] * k, (s.w * k) / 2, 0, Math.PI * 2); ctx.fill()
            continue
        }
        ctx.beginPath()
        ctx.moveTo(p[0] * k, p[1] * k)
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * k, p[i + 1] * k)
        ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
}

// 쪽 위에 투명 종이처럼 겹쳐 보여 주는 그림 (클릭은 아래로 통과)
export function DrawingOverlay({ drawing, className = '' }: { drawing: Drawing | null; className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null)
    useEffect(() => { if (ref.current && drawing) paint(ref.current, drawing) }, [drawing])
    if (!drawing) return null
    return (
        <canvas
            ref={ref}
            width={BACK_W}
            height={Math.round(BACK_W / drawing.a)}
            className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
            aria-hidden="true"
        />
    )
}

const COLORS = ['#1f2937', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#92400e', '#ffffff']
const SIZES = [{ label: '가늘게', w: 4, dot: 8 }, { label: '보통', w: 10, dot: 14 }, { label: '굵게', w: 24, dot: 22 }]

export function DrawingPad({ initial, aspect, onDone, onCancel }: {
    initial: Drawing | null
    aspect: number                 // 그림이 얹힐 쪽의 가로÷세로
    onDone: (d: Drawing | null) => void
    onCancel: () => void
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const strokes = useRef<Stroke[]>(initial ? initial.s.map(s => ({ ...s, p: [...s.p] })) : [])
    const cur = useRef<Stroke | null>(null)
    const [color, setColor] = useState(COLORS[0])
    const [size, setSize] = useState(1)
    const [eraser, setEraser] = useState(false)
    const [count, setCount] = useState(strokes.current.length)
    const [tooBig, setTooBig] = useState(false)

    const a = initial?.a ?? aspect
    const redraw = useCallback(() => {
        if (canvasRef.current) paint(canvasRef.current, { a, s: cur.current ? [...strokes.current, cur.current] : strokes.current })
    }, [a])
    useEffect(() => { redraw() }, [redraw])

    const undo = useCallback(() => { strokes.current.pop(); setCount(strokes.current.length); setTooBig(false); redraw() }, [redraw])
    const clear = () => { strokes.current = []; setCount(0); setTooBig(false); redraw() }

    // 책이 쪽을 넘기는 키보드 동작이 그림 그리는 중에 끼어들지 않게 막는다
    useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
                e.preventDefault(); e.stopPropagation()
            } else if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
            else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); undo() }
        }
        window.addEventListener('keydown', k, true)
        return () => window.removeEventListener('keydown', k, true)
    }, [onCancel, undo])

    const pos = (e: React.PointerEvent) => {
        const r = canvasRef.current!.getBoundingClientRect()
        return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000 / a)]
    }
    const down = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        e.currentTarget.setPointerCapture(e.pointerId)
        const w = SIZES[size].w * (eraser ? 2.5 : 1)
        cur.current = { c: color, w, ...(eraser ? { e: 1 as const } : {}), p: pos(e) }
        redraw()
    }
    const move = (e: React.PointerEvent) => {
        const s = cur.current
        if (!s) return
        const [x, y] = pos(e)
        const n = s.p.length
        if (Math.abs(x - s.p[n - 2]) + Math.abs(y - s.p[n - 1]) < 2) return // 너무 가까운 점은 버려 저장 크기를 줄인다
        s.p.push(x, y)
        redraw()
    }
    const up = () => {
        const s = cur.current
        if (!s) return
        cur.current = null
        strokes.current.push(s)
        setCount(strokes.current.length)
        redraw()
    }

    const done = () => {
        const d: Drawing | null = strokes.current.length ? { a, s: strokes.current } : null
        if (d && JSON.stringify(d).length > MAX_JSON) { setTooBig(true); return }
        onDone(d)
    }

    const btn = 'min-h-[48px] px-4 rounded-xl font-bold text-base transition border-2 '
    return createPortal(
        <div
            className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-3"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="그림 그리기"
        >
            <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col items-center gap-3 max-h-full overflow-auto">
                <p className="text-lg font-bold text-gray-800">그림을 그려 보세요</p>

                <div
                    className="relative rounded-xl border-2 border-gray-300 overflow-hidden"
                    style={{
                        aspectRatio: String(a), height: `min(56vh, calc(88vw / ${a}))`,
                        backgroundColor: '#fff',
                        backgroundImage: 'linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%)',
                        backgroundSize: '20px 20px', backgroundPosition: '0 0,10px 10px',
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={BACK_W}
                        height={Math.round(BACK_W / a)}
                        className="absolute inset-0 w-full h-full"
                        style={{ touchAction: 'none', cursor: eraser ? 'cell' : 'crosshair' }}
                        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                    />
                </div>

                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="색 고르기">
                    {COLORS.map(c => (
                        <button
                            key={c} type="button" onClick={() => { setColor(c); setEraser(false) }}
                            aria-label={`색 ${c}`} aria-pressed={!eraser && color === c}
                            className={`w-11 h-11 rounded-full border-2 transition ${!eraser && color === c ? 'border-brand-purple ring-4 ring-brand-purple/30 scale-110' : 'border-gray-300'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="굵기 고르기">
                    {SIZES.map((s, i) => (
                        <button
                            key={s.label} type="button" onClick={() => setSize(i)} aria-pressed={size === i}
                            className={btn + 'flex items-center gap-2 ' + (size === i ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-200 text-gray-600')}
                        >
                            <span className="rounded-full bg-current inline-block" style={{ width: s.dot, height: s.dot }} />{s.label}
                        </button>
                    ))}
                    <button
                        type="button" onClick={() => setEraser(v => !v)} aria-pressed={eraser}
                        className={btn + (eraser ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-200 text-gray-600')}
                    >지우개</button>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={undo} disabled={!count} className={btn + 'border-gray-200 text-gray-700 disabled:opacity-40'}>↩ 되돌리기</button>
                    <button type="button" onClick={clear} disabled={!count} className={btn + 'border-gray-200 text-gray-700 disabled:opacity-40'}>모두 지우기</button>
                </div>

                {tooBig && <p role="alert" className="text-sm font-bold text-red-600">그림이 너무 커요. 조금 지우고 다시 눌러 주세요.</p>}

                <div className="flex gap-2 w-full justify-center">
                    <button type="button" onClick={onCancel} className={btn + 'border-gray-300 text-gray-600'}>그만두기</button>
                    <button type="button" onClick={done} className={btn + 'border-brand-purple bg-brand-purple text-white px-8'}>그림 넣기</button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
