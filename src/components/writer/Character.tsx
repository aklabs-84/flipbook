import { memo } from 'react'
import type { Look, Mood, Temper } from '../../types/writer'
import { BODY_PARTS, HAIR_COLOR_PARTS, SKIN_PARTS, SKIN_SHADE, normalizeLook } from '../../data/charParts'

export type { Mood }

const INK = '#4A3228'
const TOMATO = '#E8553E'
const MUSTARD = '#F7C844'

// 얼굴형: 윤곽선과 귀 위치. 눈(y84)·코(y95)·입(y106) 자리는 모든 얼굴형이 같다
const FACES: Record<string, { d: string; ear: number }> = {
    round: { d: 'M40 80Q40 38 80 38Q120 38 120 80Q120 118 80 118Q40 118 40 80Z', ear: 40 },
    oval: { d: 'M44 76Q44 36 80 36Q116 36 116 76Q116 124 80 126Q44 124 44 76Z', ear: 44 },
    square: { d: 'M41 70Q41 38 80 38Q119 38 119 70L117 94Q114 120 80 120Q46 120 43 94Z', ear: 41 },
    heart: { d: 'M40 68Q40 38 80 38Q120 38 120 68Q119 92 98 110Q88 120 80 120Q72 120 62 110Q41 92 40 68Z', ear: 40 },
}

const BROW_D: Record<string, string> = {
    normal: 'M-8 1Q0 -3 8 0',
    thick: 'M-8 1Q0 -3 8 0',
    sad: 'M-8 2Q0 0 8 -4',
    up: 'M-8 -3Q0 -2 8 2',
}

const OPEN_EYES = ['dot', 'big', 'narrow']

function Eye({ kind, side, female }: { kind: string; side: -1 | 1; female: boolean }) {
    const lash = female && OPEN_EYES.includes(kind) && <path d={`M${6.5 * side} -3.5l${3 * side} -2.6`} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    return (
        <g transform={`translate(${80 + side * 16} 84)`}>
            {kind === 'dot' && (<><ellipse rx="4.4" ry="5.4" fill={INK} /><circle cx="1.6" cy="-2" r="1.5" fill="#fff" /></>)}
            {kind === 'big' && (
                <>
                    <ellipse rx="6.2" ry="7.6" fill={INK} />
                    <ellipse cy="1.2" rx="3.4" ry="4.4" fill="#8A5A3C" opacity=".7" />
                    <circle cx="2" cy="-3" r="2.2" fill="#fff" /><circle cx="-2" cy="2.6" r="1.1" fill="#fff" />
                    <path d="M-7.2 -5.2Q0 -10.5 7.2 -5.2" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
                </>
            )}
            {kind === 'narrow' && (<><ellipse rx="5.8" ry="3" fill={INK} /><circle cx="1.6" cy="-.8" r="1.1" fill="#fff" /></>)}
            {kind === 'smile' && <path d="M-6.5 2.5Q0 -6 6.5 2.5" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />}
            {kind === 'sleepy' && (<><path d="M-6.5 -1Q0 5.5 6.5 -1" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" /><path d={`M${6.5 * side} -1l${2.6 * side} -2`} stroke={INK} strokeWidth="2" strokeLinecap="round" /></>)}
            {kind === 'wide' && (<><circle r="8.2" fill="#fff" stroke={INK} strokeWidth="2" /><circle r="3.2" fill={INK} /><circle cx="1.2" cy="-1.2" r="1.1" fill="#fff" /></>)}
            {lash}
        </g>
    )
}

function eyeKind(base: string, mood: Mood): string {
    if (mood === 'happy') return 'smile'
    if (mood === 'surprise') return 'wide'
    if (mood !== 'idle' && !OPEN_EYES.includes(base)) return 'dot'
    return base
}

function Mouth({ base, mood }: { base: string; mood: Mood }) {
    if (mood === 'happy') return <path d="M68 103Q80 120 92 103Z" fill={TOMATO} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
    if (mood === 'fire') return (<><path d="M66 102Q80 124 94 102Z" fill={TOMATO} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" /><path d="M70 105H90" stroke="#fff" strokeWidth="3" /></>)
    if (mood === 'surprise') return <ellipse cx="80" cy="108" rx="4.6" ry="6.2" fill="#7A2E22" stroke={INK} strokeWidth="2.4" />
    if (mood === 'worry') return <path d="M71 111Q80 102 89 111" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    if (mood === 'think') return <path d="M72 108Q80 104 90 107" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    if (base === 'grin') return <path d="M68 103Q80 120 92 103Z" fill={TOMATO} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
    if (base === 'small') return <path d="M75 105Q80 109.5 85 105" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    if (base === 'flat') return <path d="M73 106.5H87" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
    return <path d="M70 104Q80 113 90 104" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
}

function Nose({ kind, shade }: { kind: string; shade: string }) {
    if (kind === 'round') return <path d="M76 94Q80 99.5 84 94" stroke={shade} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    if (kind === 'point') return <path d="M80.5 88L77 97Q80 99.5 83.5 97" stroke={shade} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    return <circle cx="80" cy="95" r="1.7" fill={shade} />
}

function HairBack({ kind, c }: { kind: string; c: string }) {
    switch (kind) {
        case 'bob': return <path d="M33 84Q28 32 80 30Q132 32 127 84L127 114Q121 122 112 116L112 84L48 84L48 116Q39 122 33 114Z" fill={c} />
        case 'long': return <path d="M31 84Q26 30 80 28Q134 30 129 84L136 156Q122 166 112 152L112 94L48 94L48 152Q38 166 24 156Z" fill={c} />
        case 'braid': return (
            <g fill={c}>
                <path d="M33 84Q28 32 80 30Q132 32 127 84L127 112Q121 120 112 114L112 84L48 84L48 112Q42 118 33 112Z" />
                <ellipse cx="40" cy="124" rx="7.5" ry="9" /><ellipse cx="38" cy="141" rx="7" ry="9" /><ellipse cx="36" cy="158" rx="6.5" ry="9" /><ellipse cx="34" cy="174" rx="6" ry="8" />
                <circle cx="34" cy="184" r="5" fill={TOMATO} />
            </g>
        )
        case 'curly': return (
            <g fill={c}>
                <circle cx="40" cy="62" r="14" /><circle cx="52" cy="42" r="14" /><circle cx="80" cy="34" r="15" /><circle cx="108" cy="42" r="14" /><circle cx="120" cy="62" r="14" />
                <circle cx="34" cy="86" r="12" /><circle cx="126" cy="86" r="12" />
            </g>
        )
        case 'twin': return (
            <g fill={c}>
                <path d="M36 84Q34 34 80 32Q126 34 124 84Z" />
                <ellipse cx="29" cy="106" rx="11" ry="22" transform="rotate(8 29 106)" /><ellipse cx="131" cy="106" rx="11" ry="22" transform="rotate(-8 131 106)" />
                <circle cx="33" cy="84" r="4.5" fill={TOMATO} /><circle cx="127" cy="84" r="4.5" fill={TOMATO} />
            </g>
        )
        case 'bun': return <g fill={c}><circle cx="80" cy="25" r="15" /><path d="M36 84Q34 34 80 32Q126 34 124 84Z" /></g>
        default: return null
    }
}

function HairFront({ kind, c, shade }: { kind: string; c: string; shade: string }) {
    if (kind === 'bald') return <ellipse cx="66" cy="50" rx="10" ry="4" fill="#fff" opacity=".28" transform="rotate(-18 66 50)" />
    const fringe = ['bob', 'long', 'braid', 'twin'].includes(kind)
    return (
        <g>
            {/* 앞머리 밑에 드리우는 그림자 */}
            <path d="M44 74Q80 90 116 74Q116 64 80 64Q44 64 44 74Z" fill={shade} opacity=".32" />
            {fringe
                ? <path d="M37 84Q32 32 80 30Q128 32 123 84Q121 58 102 52Q92 66 78 60Q62 68 56 54Q40 60 37 84Z" fill={c} />
                : <path d="M37 82Q32 32 80 30Q128 32 123 82Q118 60 102 52Q84 62 60 54Q44 60 37 82Z" fill={c} />}
            {kind === 'curly' && <g fill={c}><circle cx="56" cy="52" r="12" /><circle cx="80" cy="46" r="12" /><circle cx="104" cy="52" r="12" /></g>}
            <path d="M52 47Q68 37 88 40" stroke="#fff" strokeOpacity=".24" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
    )
}

function HeadItem({ kind }: { kind: string }) {
    switch (kind) {
        case 'cap': return (<><path d="M40 56Q42 22 82 22Q120 22 120 56Z" fill={TOMATO} /><path d="M40 54H130Q134 59 127 61H40Z" fill="#C23F2B" /><circle cx="81" cy="22" r="3.4" fill="#C23F2B" /></>)
        case 'beret': return (<><ellipse cx="84" cy="36" rx="40" ry="13" fill="#66A844" transform="rotate(-8 84 36)" /><circle cx="104" cy="24" r="4.5" fill="#4F8A32" /></>)
        case 'crown': return <path d="M52 40l6-22 14 14 8-18 8 18 14-14 6 22z" fill={MUSTARD} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        case 'ribbon': return (<g transform="translate(56 42)"><path d="M0 0L-17 -9V9Z" fill={TOMATO} /><path d="M0 0L17 -9V9Z" fill={TOMATO} /><circle r="4.6" fill="#C23F2B" /></g>)
        case 'flower': return (
            <g transform="translate(54 50)">
                {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6.2} cy={Math.sin((a * Math.PI) / 180) * 6.2} r="5" fill="#F2A08F" />)}
                <circle r="3.6" fill={MUSTARD} />
            </g>
        )
        case 'phones': return (
            <g>
                <path d="M38 84Q36 22 80 22Q124 22 122 84" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="38" cy="88" rx="8" ry="12.5" fill={TOMATO} stroke={INK} strokeWidth="2.4" /><ellipse cx="122" cy="88" rx="8" ry="12.5" fill={TOMATO} stroke={INK} strokeWidth="2.4" />
            </g>
        )
        default: return null
    }
}

function Sparkle({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
    return <path className="ch-spark" style={{ animationDelay: `${d}s` }} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8L2.2 -2.2L8 0L2.2 2.2L0 8L-2.2 2.2L-8 0L-2.2 -2.2Z" fill={MUSTARD} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
}

interface Props { look: Look; mood?: Mood; temper?: Temper }

function CharacterBase({ look: rawLook, mood = 'idle', temper = 'normal' }: Props) {
    const look = normalizeLook(rawLook)
    const female = look.gender === 'f'
    const skin = SKIN_PARTS.find((p) => p.id === look.skin)?.color ?? '#FFE0C2'
    const shade = SKIN_SHADE[look.skin] ?? '#E9B995'
    const hair = HAIR_COLOR_PARTS.find((p) => p.id === look.hairColor)?.color ?? '#3A2A24'
    const shirt = BODY_PARTS.find((p) => p.id === look.body)?.color ?? '#F7C844'
    const face = FACES[look.face] ?? FACES.round
    const ek = eyeKind(look.eyes, mood)
    const eyeShift = mood === 'think' ? 'translate(2 -3)' : mood === 'worry' ? 'translate(0 2)' : mood === 'fire' ? 'translate(80 84) scale(1.12) translate(-80 -84)' : undefined
    const brow = BROW_D[look.brows] ?? BROW_D.normal
    const browW = look.brows === 'thick' ? 4.8 : 3

    return (
        <g className={`ch m-${mood} t-${temper}`}>
            <ellipse className="ch-shadow" cx="80" cy="222" rx="46" ry="7.5" fill="rgba(74,50,40,.18)" />
            <g className="ch-bob">
                {look.accessory === 'cape' && <path d="M46 126Q80 116 114 126L134 200Q80 212 26 200Z" fill={TOMATO} />}

                {/* 다리·신발 */}
                <rect x="60" y="192" width="14" height="22" rx="5" fill={skin} /><rect x="86" y="192" width="14" height="22" rx="5" fill={skin} />
                <ellipse cx="66" cy="215" rx="11" ry="5.5" fill={INK} /><ellipse cx="94" cy="215" rx="11" ry="5.5" fill={INK} />

                {/* 왼팔 */}
                <g className="ch-arm-l">
                    <line x1="48" y1="134" x2="36" y2="176" stroke={shirt} strokeWidth="13" strokeLinecap="round" />
                    <circle cx="35" cy="181" r="7.5" fill={skin} />
                </g>

                {/* 몸통 */}
                {female ? (
                    <>
                        <path d="M48 126Q80 117 112 126L116 160Q134 192 140 202Q80 212 20 202Q26 192 44 160Z" fill={shirt} />
                        <path d="M80 118Q116 128 116 160Q134 192 140 202Q124 206 108 206Q104 150 80 118Z" fill="#000" opacity=".07" />
                        <path d="M68 124Q80 134 92 124" stroke="#fff" strokeOpacity=".7" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M50 158Q80 166 110 158" stroke={INK} strokeOpacity=".18" strokeWidth="3" fill="none" />
                    </>
                ) : (
                    <>
                        <path d="M42 128Q80 117 118 128L120 188Q80 194 40 188Z" fill={shirt} />
                        <path d="M80 118Q116 130 118 128L120 188Q100 191 90 192Q96 150 80 118Z" fill="#000" opacity=".07" />
                        <path d="M68 124L80 137L92 124" stroke="#fff" strokeOpacity=".7" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M42 186H118L123 205H88L80 195L72 205H37Z" fill="#4A5A78" />
                    </>
                )}

                {/* 목 */}
                <rect x="71" y="106" width="18" height="24" rx="7" fill={shade} />

                {/* 목 장신구 */}
                {look.accessory === 'scarf' && (<><path d="M54 120Q80 136 106 120L111 133Q80 151 49 133Z" fill={TOMATO} /><path d="M97 134l11 30-13 3z" fill="#C23F2B" /></>)}
                {look.accessory === 'bowtie' && (<g transform="translate(80 127)"><path d="M0 0L-15 -8V8Z" fill={TOMATO} /><path d="M0 0L15 -8V8Z" fill={TOMATO} /><circle r="4" fill="#C23F2B" /></g>)}
                {look.accessory === 'necklace' && (<><path d="M62 123Q80 144 98 123" stroke={MUSTARD} strokeWidth="2.6" fill="none" /><circle cx="80" cy="138" r="4.6" fill={MUSTARD} stroke={INK} strokeWidth="1.6" /></>)}

                {/* 오른팔 + 손에 든 것 */}
                <g className="ch-arm-r">
                    <line x1="112" y1="134" x2="138" y2="116" stroke={shirt} strokeWidth="13" strokeLinecap="round" />
                    {look.hold === 'pen' && (<><line x1="142" y1="112" x2="154" y2="84" stroke={INK} strokeWidth="4.5" strokeLinecap="round" /><line x1="153" y1="88" x2="155" y2="82" stroke={TOMATO} strokeWidth="5" strokeLinecap="round" /></>)}
                    {look.hold === 'notebook' && (<g transform="rotate(-12 144 104)"><rect x="132" y="88" width="26" height="30" rx="3" fill="#FFF8E7" stroke={INK} strokeWidth="2.4" /><path d="M138 98h14M138 105h14M138 112h9" stroke="#BDA98A" strokeWidth="2" strokeLinecap="round" /></g>)}
                    {look.hold === 'wand' && (<><line x1="142" y1="112" x2="154" y2="86" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path transform="translate(155 80)" d="M0 -9L2.6 -2.6L9 0L2.6 2.6L0 9L-2.6 2.6L-9 0L-2.6 -2.6Z" fill={MUSTARD} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /></>)}
                    <circle cx="141" cy="113" r="7.5" fill={skin} />
                </g>

                {/* 머리 */}
                <g className="ch-head">
                    <HairBack kind={look.hair} c={hair} />
                    <circle cx={face.ear + 1} cy="88" r="7.5" fill={skin} /><circle cx={160 - face.ear - 1} cy="88" r="7.5" fill={skin} />
                    <circle cx={face.ear + 1} cy="88" r="3.6" fill={shade} opacity=".55" /><circle cx={160 - face.ear - 1} cy="88" r="3.6" fill={shade} opacity=".55" />
                    <path d={face.d} fill={skin} />
                    <path d="M58 114Q80 124 102 114" stroke={shade} strokeOpacity=".4" strokeWidth="5" fill="none" strokeLinecap="round" />
                    <HairFront kind={look.hair} c={hair} shade={shade} />

                    {/* 표정: 눈썹·눈·코·입 */}
                    <g className="ch-brow ch-brow-l"><g transform="translate(64 70)"><path d={brow} stroke={INK} strokeOpacity=".9" strokeWidth={browW} fill="none" strokeLinecap="round" /></g></g>
                    <g className="ch-brow ch-brow-r"><g transform="translate(96 70) scale(-1 1)"><path d={brow} stroke={INK} strokeOpacity=".9" strokeWidth={browW} fill="none" strokeLinecap="round" /></g></g>
                    <g transform={eyeShift} className={OPEN_EYES.includes(ek) ? 'ch-eyes' : undefined}>
                        <Eye kind={ek} side={-1} female={female} /><Eye kind={ek} side={1} female={female} />
                    </g>
                    <Nose kind={look.nose} shade={shade} />
                    <Mouth base={look.mouth} mood={mood} />
                    <circle cx="52" cy="99" r="6.5" fill={TOMATO} opacity={mood === 'worry' ? 0.12 : 0.26} /><circle cx="108" cy="99" r="6.5" fill={TOMATO} opacity={mood === 'worry' ? 0.12 : 0.26} />

                    {/* 얼굴 장신구 */}
                    {look.accessory === 'freckle' && <g fill={shade}><circle cx="50" cy="93" r="1.2" /><circle cx="55" cy="96.5" r="1.2" /><circle cx="60" cy="93" r="1.2" /><circle cx="100" cy="93" r="1.2" /><circle cx="105" cy="96.5" r="1.2" /><circle cx="110" cy="93" r="1.2" /></g>}
                    {look.accessory === 'glasses' && (<g fill="#fff" fillOpacity=".14" stroke={INK} strokeWidth="3"><rect x="52" y="73" width="24" height="20" rx="7" /><rect x="84" y="73" width="24" height="20" rx="7" /><line x1="76" y1="83" x2="84" y2="83" /></g>)}
                    {look.accessory === 'round' && (<g fill="#fff" fillOpacity=".14" stroke="#C99A2E" strokeWidth="2.6"><circle cx="64" cy="84" r="12" /><circle cx="96" cy="84" r="12" /><line x1="76" y1="83" x2="84" y2="83" /></g>)}
                    {look.accessory === 'earring' && (<g fill={MUSTARD} stroke={INK} strokeWidth="1.4"><circle cx={face.ear + 1} cy="99" r="3.4" /><circle cx={160 - face.ear - 1} cy="99" r="3.4" /></g>)}

                    <HeadItem kind={look.hat} />
                </g>

                {/* 마음 효과 */}
                {mood === 'think' && (<g className="ch-fx" transform="translate(114 16)"><path d="M0 8Q0 0 8 0Q16 0 16 8Q16 14 8 17V22" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" /><circle cx="8" cy="30" r="2.2" fill={INK} /></g>)}
                {mood === 'surprise' && (<g className="ch-fx" transform="translate(120 12)"><rect x="0" y="0" width="6" height="20" rx="3" fill={TOMATO} /><circle cx="3" cy="28" r="3.4" fill={TOMATO} /></g>)}
                {mood === 'worry' && <path className="ch-drop" d="M120 58Q126 68 120 74Q114 68 120 58Z" fill="#9FD3F0" stroke="#5BA7D6" strokeWidth="1.6" strokeLinejoin="round" />}
                {mood === 'fire' && (<><Sparkle x={22} y={40} s={1.1} /><Sparkle x={140} y={44} s={0.9} d={0.35} /><Sparkle x={126} y={14} s={0.7} d={0.7} /><Sparkle x={34} y={12} s={0.6} d={0.5} /></>)}
                {mood === 'happy' && (<><Sparkle x={24} y={50} s={0.7} /><Sparkle x={138} y={46} s={0.6} d={0.4} /></>)}
            </g>
        </g>
    )
}

export default memo(CharacterBase)
