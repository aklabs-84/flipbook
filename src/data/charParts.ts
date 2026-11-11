import type { Look } from '../types/writer'

// 작가 친구 도감: 처음 고르는 9명(사람 6 + 도구 3)과 꾸미기 선택지.
// 저장은 브라우저(localStorage)에만 하므로 서버 비용은 0이다.

export interface Swatch { color: string; label: string }
export interface Deco { id: string; label: string; unlockLevel: number; kinds: Look['kind'][] }
export interface Sample { id: string; name: string; hint: string; look: Look }

export const SKINS: Swatch[] = [
    { color: '#F6D3B5', label: '밝은 살색' },
    { color: '#EBB98F', label: '보통 살색' },
    { color: '#D69B6E', label: '구릿빛' },
    { color: '#A86B45', label: '진한 살색' },
    { color: '#6E3F26', label: '짙은 갈색' },
]
// 사람 친구는 옷 색, 도구 친구는 몸 색으로 쓴다
export const COLORS: Swatch[] = [
    { color: '#EF6A55', label: '토마토' },
    { color: '#F7C844', label: '머스터드' },
    { color: '#7CC15A', label: '초록' },
    { color: '#6DBBE0', label: '하늘' },
    { color: '#B792E0', label: '보라' },
    { color: '#EF8B7B', label: '살구' },
]
export const HAIR_COLORS = ['#2F211C', '#4B3321', '#5A3A22', '#8B4A2B']

export const PERSON_BASES = ['bob', 'buns', 'tuft', 'short']
export const TOOL_BASES = ['pencil', 'book', 'ink']
export const TOOL_NAME: Record<string, string> = { pencil: '연필', book: '책', ink: '잉크병' }

// 레벨이 오르면 하나씩 열린다 (이미 낀 것은 그대로 두고, 빼는 건 언제나 가능)
export const DECOS: Deco[] = [
    { id: 'bow', label: '리본', unlockLevel: 1, kinds: ['person', 'tool'] },
    { id: 'glasses', label: '동그란 안경', unlockLevel: 2, kinds: ['person', 'tool'] },
    { id: 'star', label: '별 스티커', unlockLevel: 2, kinds: ['tool'] },
    { id: 'hat', label: '베레모', unlockLevel: 3, kinds: ['person'] },
    { id: 'cape', label: '망토', unlockLevel: 4, kinds: ['person'] },
    { id: 'crown', label: '왕관', unlockLevel: 5, kinds: ['person', 'tool'] },
    { id: 'pet', label: '먹물 친구', unlockLevel: 5, kinds: ['person'] },
]

const person = (gender: Look['gender'], base: string, hairColor: string, body: string, deco: string[] = []): Look =>
    ({ kind: 'person', gender, base, hairColor, skin: SKINS[1].color, body, deco })
const tool = (base: string, body: string): Look =>
    ({ kind: 'tool', gender: 'f', base, hairColor: HAIR_COLORS[0], skin: SKINS[1].color, body, deco: [] })

export const SAMPLES: { girl: Sample[]; boy: Sample[]; tool: Sample[] } = {
    girl: [
        { id: 'g-bob', name: '단발 리본', hint: '리본을 단 단발머리', look: person('f', 'bob', '#2F211C', '#EF8B7B', ['bow']) },
        { id: 'g-buns', name: '양갈래', hint: '귀여운 양갈래 머리', look: person('f', 'buns', '#8B4A2B', '#B792E0') },
        { id: 'g-glass', name: '안경 친구', hint: '똑똑해 보이는 안경', look: person('f', 'bob', '#5A3A22', '#7CC15A', ['glasses']) },
    ],
    boy: [
        { id: 'b-tuft', name: '삐죽 머리', hint: '머리카락이 삐죽!', look: person('m', 'tuft', '#2F211C', '#6DBBE0') },
        { id: 'b-short', name: '단정한 머리', hint: '깔끔한 짧은 머리', look: person('m', 'short', '#4B3321', '#F7C844') },
        { id: 'b-beret', name: '베레모 친구', hint: '멋진 베레모', look: person('m', 'short', '#2F211C', '#7CC15A', ['hat']) },
    ],
    tool: [
        { id: 't-pencil', name: '연필', hint: '쓱쓱 글을 쓰는 연필', look: tool('pencil', '#F7C844') },
        { id: 't-book', name: '책', hint: '이야기가 가득한 책', look: tool('book', '#EF6A55') },
        { id: 't-ink', name: '잉크병', hint: '먹물이 찰랑찰랑', look: tool('ink', '#6DBBE0') },
    ],
}

export const DEFAULT_LOOK: Look = SAMPLES.girl[0].look

const HEX = /^#[0-9A-Fa-f]{6}$/
const inList = (list: Swatch[] | string[], v: unknown): v is string =>
    typeof v === 'string' && HEX.test(v) && (list as (Swatch | string)[]).some((s) => (typeof s === 'string' ? s : s.color).toLowerCase() === v.toLowerCase())

// 옛 부품 이름(예전 캐릭터) → 새 모양. 옛 저장 내용도 그대로 읽히게 한다
const OLD_SKIN: Record<string, string> = { s1: SKINS[0].color, s2: SKINS[1].color, s3: SKINS[2].color, s4: SKINS[3].color, s5: SKINS[4].color }
const OLD_HAIR: Record<string, string> = { short: 'short', bob: 'bob', long: 'bob', braid: 'bob', twin: 'buns', bun: 'buns', curly: 'tuft', bald: 'short' }
const OLD_HAIR_COLOR: Record<string, string> = { black: '#2F211C', brown: '#5A3A22', blonde: '#8B4A2B', red: '#8B4A2B', purple: '#2F211C' }
const OLD_BODY: Record<string, string> = { mustard: '#F7C844', sky: '#6DBBE0', coral: '#EF8B7B', lilac: '#B792E0', grass: '#7CC15A', navy: '#6DBBE0' }

type Loose = Record<string, unknown>

export function normalizeLook(raw: unknown): Look {
    const l = (raw && typeof raw === 'object' ? raw : {}) as Loose
    const isNew = l.kind === 'person' || l.kind === 'tool'
    if (!isNew) return migrateOld(l)
    const kind = l.kind as Look['kind']
    const bases = kind === 'tool' ? TOOL_BASES : PERSON_BASES
    const deco = Array.isArray(l.deco) ? l.deco.filter((d): d is string => typeof d === 'string' && DECOS.some((x) => x.id === d && x.kinds.includes(kind))) : []
    return {
        kind,
        gender: l.gender === 'm' ? 'm' : 'f',
        base: typeof l.base === 'string' && bases.includes(l.base) ? l.base : bases[0],
        hairColor: inList(HAIR_COLORS, l.hairColor) ? l.hairColor : HAIR_COLORS[0],
        skin: inList(SKINS, l.skin) ? l.skin : SKINS[1].color,
        body: inList(COLORS, l.body) ? l.body : COLORS[1].color,
        deco: Array.from(new Set(deco)),
    }
}

function migrateOld(l: Loose): Look {
    const s = (k: string) => (typeof l[k] === 'string' ? (l[k] as string) : '')
    const gender: Look['gender'] = s('gender') === 'm' ? 'm' : 'f'
    const deco: string[] = []
    if (['glasses', 'round'].includes(s('accessory'))) deco.push('glasses')
    if (s('accessory') === 'cape') deco.push('cape')
    if (s('hat') === 'beret') deco.push('hat')
    if (s('hat') === 'crown') deco.push('crown')
    if (s('hat') === 'ribbon') deco.push('bow')
    return {
        kind: 'person',
        gender,
        base: OLD_HAIR[s('hair')] ?? (gender === 'm' ? 'short' : 'bob'),
        hairColor: OLD_HAIR_COLOR[s('hairColor')] ?? HAIR_COLORS[0],
        skin: OLD_SKIN[s('skin')] ?? SKINS[1].color,
        body: OLD_BODY[s('body')] ?? COLORS[1].color,
        deco,
    }
}

export function unlockedDecos(kind: Look['kind'], level: number) {
    return DECOS.filter((d) => d.kinds.includes(kind) && d.unlockLevel <= level)
}
