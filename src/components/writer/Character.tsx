import { memo } from 'react'
import type { Look, Mood, Temper } from '../../types/writer'
import { TOOL_NAME, normalizeLook } from '../../data/charParts'

export type { Mood }

// 모든 작가 친구는 가로 200 × 세로 230 칸 안에 그려진다
export const CHAR_VIEWBOX = '0 0 200 230'

const INK = '#4A3228'
const TOMATO = '#E8553E'
const MUSTARD = '#F7C844'
const PINK = '#F59C8B'

/* ───────── 사람 친구 (동글이) ───────── */
function personSvg(look: Look, mood: Mood): string {
    const sk = look.skin, hc = look.hairColor, bd = look.body, m = mood
    const has = (d: string) => look.deco.includes(d)
    const eyeL = [76, 98], eyeR = [124, 98]
    let s = `<ellipse class="ch-shadow" cx="100" cy="222" rx="52" ry="7" fill="rgba(74,50,40,.18)"/><g class="ch-bob">`
    if (has('cape')) s += `<path d="M60 150Q100 138 140 150L156 214Q100 226 44 214Z" fill="#C94430" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    if (has('pet')) s += `<g transform="translate(166 196)"><ellipse rx="17" ry="14" fill="#3a2a24"/><path d="M12 -8Q26 -22 30 -8Q22 -10 14 -2Z" fill="#3a2a24"/><circle cx="-5" cy="-3" r="3.6" fill="#fff"/><circle cx="6" cy="-3" r="3.6" fill="#fff"/><circle cx="-4.4" cy="-2.6" r="1.6" fill="#3a2a24"/><circle cx="6.6" cy="-2.6" r="1.6" fill="#3a2a24"/></g>`
    s += `<ellipse cx="82" cy="216" rx="14" ry="8" fill="#6b4a3a"/><ellipse cx="118" cy="216" rx="14" ry="8" fill="#6b4a3a"/>`
    s += `<path d="M70 207Q62 152 100 146Q138 152 130 207Q100 216 70 207Z" fill="${bd}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    s += `<path d="M88 148Q100 160 112 148" fill="#FFFDF6" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`
    const up = m === 'fire' || m === 'happy'
    s += `<g stroke="${INK}" stroke-width="2.5"><ellipse cx="64" cy="${up ? 160 : 174}" rx="9" ry="14" transform="rotate(${up ? 35 : 18} 64 ${up ? 160 : 174})" fill="${bd}"/><ellipse cx="136" cy="${up ? 160 : 174}" rx="9" ry="14" transform="rotate(${up ? -35 : -18} 136 ${up ? 160 : 174})" fill="${bd}"/></g>`
    s += `<circle cx="${up ? 52 : 58}" cy="${up ? 146 : 188}" r="8" fill="${sk}" stroke="${INK}" stroke-width="2.5"/><circle cx="${up ? 148 : 142}" cy="${up ? 146 : 188}" r="8" fill="${sk}" stroke="${INK}" stroke-width="2.5"/>`
    // 뒷머리
    if (look.base === 'bob') s += `<path d="M34 98Q30 36 100 34Q170 36 166 98L168 140Q152 146 148 122L52 122Q48 146 32 140Z" fill="${hc}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    if (look.base === 'buns') s += `<circle cx="44" cy="48" r="21" fill="${hc}" stroke="${INK}" stroke-width="2.5"/><circle cx="156" cy="48" r="21" fill="${hc}" stroke="${INK}" stroke-width="2.5"/>`
    s += `<circle cx="37" cy="102" r="10" fill="${sk}" stroke="${INK}" stroke-width="2.5"/><circle cx="163" cy="102" r="10" fill="${sk}" stroke="${INK}" stroke-width="2.5"/>`
    s += `<ellipse cx="100" cy="96" rx="64" ry="56" fill="${sk}" stroke="${INK}" stroke-width="2.5"/>`
    // 앞머리
    s += `<path d="M37 92Q36 38 100 38Q164 38 163 92Q152 64 122 68Q100 54 78 68Q48 64 37 92Z" fill="${hc}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    if (look.base === 'tuft') s += `<path d="M94 40Q86 14 108 12Q102 26 114 38Z" fill="${hc}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    // 볼
    s += `<ellipse cx="62" cy="114" rx="11" ry="6.5" fill="${PINK}" opacity=".65"/><ellipse cx="138" cy="114" rx="11" ry="6.5" fill="${PINK}" opacity=".65"/>`
    // 얼굴
    const eye = (c: number[]) => `<g transform="translate(${c[0]} ${c[1]})"><ellipse rx="8" ry="10.5" fill="${INK}"/><circle cx="2.8" cy="-3.6" r="3.2" fill="#fff"/><circle cx="-2.6" cy="3" r="1.6" fill="#fff"/></g>`
    if (m === 'idle') s += eye(eyeL) + eye(eyeR) + `<path d="M92 120Q100 127 108 120" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    if (m === 'happy') {
        for (const c of [eyeL, eyeR]) s += `<path d="M${c[0] - 10} ${c[1] + 3}Q${c[0]} ${c[1] - 10} ${c[0] + 10} ${c[1] + 3}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        s += `<path d="M88 114Q100 134 112 114Z" fill="#B53A2A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M93 123Q100 129 107 123" fill="${PINK}"/>`
    }
    if (m === 'think') s += eye(eyeL) + eye(eyeR) + `<path d="M110 80Q124 72 140 80" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M92 122L108 119" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="160" cy="40" r="4" fill="${INK}" opacity=".55"/><circle cx="172" cy="28" r="6" fill="${INK}" opacity=".55"/><circle cx="188" cy="14" r="8" fill="${INK}" opacity=".55"/>`
    if (m === 'surprise') {
        for (const c of [eyeL, eyeR]) s += `<circle cx="${c[0]}" cy="${c[1]}" r="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${c[0]}" cy="${c[1]}" r="4.6" fill="${INK}"/>`
        s += `<ellipse cx="100" cy="124" rx="7" ry="9" fill="#B53A2A" stroke="${INK}" stroke-width="2.5"/><path d="M60 62l-8-10M140 62l8-10M100 36v-12" stroke="${MUSTARD}" stroke-width="4" stroke-linecap="round"/>`
    }
    if (m === 'worry') s += eye(eyeL) + eye(eyeR) + `<path d="M64 80L86 86M136 80L114 86" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M90 124Q95 117 100 124Q105 131 110 124" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M152 70Q162 86 152 92Q142 86 152 70Z" fill="#8FD0EE" stroke="${INK}" stroke-width="2"/>`
    if (m === 'fire') s += eye(eyeL) + eye(eyeR) + `<path d="M62 84L90 92M138 84L110 92" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M86 114Q100 136 114 114Z" fill="#B53A2A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 70Q10 56 22 40Q24 54 34 56Q32 64 24 70ZM176 70Q190 56 178 40Q176 54 166 56Q168 64 176 70Z" fill="${TOMATO}" stroke="${INK}" stroke-width="2"/>`
    // 여자 친구는 눈꼬리에 속눈썹 한 가닥
    if (look.gender === 'f') for (const c of [eyeL, eyeR]) s += `<path d="M${c[0] + (c[0] < 100 ? -8 : 8)} ${c[1] - 5}l${c[0] < 100 ? -6 : 6} -6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
    if (has('bow')) s += `<g transform="translate(142 54) rotate(18)" fill="${TOMATO}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"><path d="M0 0L-20 -12V12Z"/><path d="M0 0L20 -12V12Z"/><circle r="5.5"/></g>`
    if (has('glasses')) s += `<g fill="rgba(255,255,255,.28)" stroke="${INK}" stroke-width="3"><circle cx="76" cy="98" r="17"/><circle cx="124" cy="98" r="17"/><path d="M93 98H107" fill="none"/></g>`
    if (has('hat')) s += `<g transform="rotate(-8 100 46)"><ellipse cx="100" cy="44" rx="52" ry="17" fill="#7A4E8C" stroke="${INK}" stroke-width="2.5"/><circle cx="104" cy="26" r="5.5" fill="#7A4E8C" stroke="${INK}" stroke-width="2.5"/></g>`
    if (has('crown')) {
        s += `<path d="M70 44L74 18L90 34L100 12L110 34L126 18L130 44Z" fill="${MUSTARD}" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><circle cx="100" cy="30" r="4" fill="${TOMATO}" stroke="${INK}" stroke-width="1.6"/>`
        s += `<g class="ch-spark" fill="${MUSTARD}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"><path d="M22 120l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/><path d="M178 112l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></g>`
    }
    return s + '</g>'
}

/* ───────── 도구 친구 (연필·책·잉크병) ───────── */
type ToolBase = { f: number[]; top: number[]; body: (c: string) => string }
const TOOLS: Record<string, ToolBase> = {
    pencil: { f: [100, 120], top: [100, 20], body: (c) => `<path d="M64 74L100 20L136 74Z" fill="#F2C79A" stroke="${INK}" stroke-width="4"/><path d="M89 38L100 20L111 38Z" fill="${INK}"/><rect x="64" y="74" width="72" height="104" fill="${c}" stroke="${INK}" stroke-width="4"/><rect x="64" y="178" width="72" height="14" fill="#C9CED6" stroke="${INK}" stroke-width="4"/><rect x="64" y="192" width="72" height="22" rx="10" fill="${PINK}" stroke="${INK}" stroke-width="4"/>` },
    book: { f: [108, 114], top: [100, 36], body: (c) => `<rect x="40" y="38" width="124" height="152" rx="12" fill="${c}" stroke="${INK}" stroke-width="4"/><rect x="40" y="38" width="20" height="152" rx="10" fill="rgba(74,50,40,.22)" stroke="${INK}" stroke-width="4"/><rect x="50" y="186" width="114" height="12" rx="5" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/><path d="M130 38V70L137 63L144 70V38Z" fill="${MUSTARD}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>` },
    ink: { f: [100, 150], top: [100, 34], body: (c) => `<rect x="82" y="52" width="36" height="26" fill="#EAF4F9" stroke="${INK}" stroke-width="4"/><rect x="76" y="34" width="48" height="20" rx="5" fill="#C98F5A" stroke="${INK}" stroke-width="4"/><path d="M118 40Q152 4 178 14Q164 44 124 46Z" fill="#fff" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M48 106Q48 74 80 74H120Q152 74 152 106V182Q152 210 124 210H76Q48 210 48 182Z" fill="#EAF4F9" stroke="${INK}" stroke-width="4"/><path d="M54 118Q54 112 62 112H138Q146 112 146 118V184Q146 204 124 204H76Q54 204 54 184Z" fill="${c}"/>` },
}

function toolFace(fx: number, fy: number, m: Mood, deco: string[]): string {
    const eye = (x: number, px: number, py: number, r = 11, pr = 5.5) => `<circle cx="${x}" cy="0" r="${r}" fill="#fff" stroke="${INK}" stroke-width="3.2"/><circle cx="${x + px}" cy="${py}" r="${pr}" fill="${INK}"/><circle cx="${x + px + 2}" cy="${py - 2}" r="1.8" fill="#fff"/>`
    let s = `<g transform="translate(${fx} ${fy})" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="-30" cy="14" rx="8" ry="5" fill="${PINK}" opacity=".75"/><ellipse cx="30" cy="14" rx="8" ry="5" fill="${PINK}" opacity=".75"/>`
    if (m === 'idle') s += eye(-16, 0, 1) + eye(16, 0, 1) + `<path d="M-8 22Q0 30 8 22" stroke="${INK}" stroke-width="3.5" fill="none"/>`
    if (m === 'happy') s += `<path d="M-27 4Q-16 -12 -5 4M5 4Q16 -12 27 4" stroke="${INK}" stroke-width="4.5" fill="none"/><path d="M-13 18Q0 40 13 18Z" fill="#B53A2A" stroke="${INK}" stroke-width="3"/>`
    if (m === 'think') s += eye(-16, 3, -4) + eye(16, 3, -4) + `<path d="M6 -22Q18 -30 30 -22" stroke="${INK}" stroke-width="4" fill="none"/><path d="M-10 26Q-4 20 2 26T14 24" stroke="${INK}" stroke-width="3.5" fill="none"/><text x="38" y="-26" font-family="Black Han Sans, sans-serif" font-size="26" fill="${INK}">?</text>`
    if (m === 'surprise') s += eye(-16, 0, 0, 13, 3.4) + eye(16, 0, 0, 13, 3.4) + `<ellipse cx="0" cy="28" rx="7" ry="10" fill="#B53A2A" stroke="${INK}" stroke-width="3"/><path d="M-46 -20l-9 -6M46 -20l9 -6M0 -30v-12" stroke="${INK}" stroke-width="4"/>`
    if (m === 'worry') s += eye(-16, 0, 4) + eye(16, 0, 4) + `<path d="M-30 -18L-8 -13M30 -18L8 -13" stroke="${INK}" stroke-width="4" fill="none"/><path d="M-10 26Q-5 19 0 26Q5 33 10 26" stroke="${INK}" stroke-width="3.5" fill="none"/><path d="M40 -22Q50 -6 40 0Q30 -6 40 -22Z" fill="#8FD0EE" stroke="${INK}" stroke-width="2.4"/>`
    if (m === 'fire') s += eye(-16, 0, 1, 11, 6) + eye(16, 0, 1, 11, 6) + `<path d="M-30 -16L-6 -8M30 -16L6 -8" stroke="${INK}" stroke-width="5" fill="none"/><path d="M-13 18Q0 40 13 18Z" fill="#B53A2A" stroke="${INK}" stroke-width="3"/><path d="M-52 -4Q-62 -18 -52 -30Q-50 -20 -42 -18Q-44 -10 -52 -4ZM52 -4Q62 -18 52 -30Q50 -20 42 -18Q44 -10 52 -4Z" fill="${MUSTARD}" stroke="${INK}" stroke-width="2.4"/>`
    if (deco.includes('glasses')) s += `<g fill="rgba(255,255,255,.2)" stroke="${INK}" stroke-width="3.4"><circle cx="-16" cy="0" r="17"/><circle cx="16" cy="0" r="17"/></g>`
    if (deco.includes('star')) s += `<path d="M-38 24l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="${MUSTARD}" stroke="${INK}" stroke-width="2.4" transform="scale(.9)"/>`
    return s + '</g>'
}

function toolSvg(look: Look, mood: Mood): string {
    const b = TOOLS[look.base] ?? TOOLS.pencil
    let s = `<ellipse class="ch-shadow" cx="100" cy="222" rx="52" ry="7" fill="rgba(74,50,40,.18)"/><g class="ch-bob">` + b.body(look.body) + toolFace(b.f[0], b.f[1], mood, look.deco)
    const [tx, ty] = b.top
    if (look.deco.includes('crown')) s += `<path d="M${tx - 26} ${ty + 6}L${tx - 22} ${ty - 20}L${tx - 9} ${ty - 5}L${tx} ${ty - 26}L${tx + 9} ${ty - 5}L${tx + 22} ${ty - 20}L${tx + 26} ${ty + 6}Z" fill="${MUSTARD}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><circle cx="${tx}" cy="${ty - 8}" r="4" fill="${TOMATO}" stroke="${INK}" stroke-width="2"/>`
    if (look.deco.includes('bow')) s += `<g transform="translate(${b.f[0] + 34} ${b.f[1] - 44})" fill="${TOMATO}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"><path d="M0 0L-22 -13V13Z"/><path d="M0 0L22 -13V13Z"/><circle r="6"/></g>`
    return s + '</g>'
}

export function characterName(look: Look): string {
    const l = normalizeLook(look)
    return l.kind === 'tool' ? `${TOOL_NAME[l.base] ?? '글쓰기'} 친구` : '동글이 작가'
}

interface Props { look: Look; mood?: Mood; temper?: Temper }

// 부모가 <svg viewBox={CHAR_VIEWBOX}> 안에 넣어 쓴다. 그림 문자열은 우리가 만들고, 색은 normalizeLook이 #RRGGBB만 통과시킨다
function CharacterBase({ look: rawLook, mood = 'idle', temper = 'normal' }: Props) {
    const look = normalizeLook(rawLook)
    const html = look.kind === 'tool' ? toolSvg(look, mood) : personSvg(look, mood)
    return <g className={`ch m-${mood} t-${temper}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export default memo(CharacterBase)
