import type { Persona, Stanza, StampKind } from '../types/writer'
import { getGenre } from '../data/genres'
import type { GenreId } from '../types/writer'

export const MAX_SEED = 600
export const MAX_RAW = 4000

export const MAX_TOPIC = 120
export const MAX_SAMPLES = 3
export const SAMPLE_CHARS = 400

export interface PromptOptions {
    /** 내 글 모음 파일을 올려 쓸 때 (말투는 그 파일 전체에서 배운다) */
    useLibrary?: boolean
    /** 'topic'=오늘 쓸 주제 한 줄, 'continue'=내 글 한 편을 바탕으로 이어 쓰기·고쳐 쓰기 */
    mode?: 'topic' | 'continue'
    /** 파일을 올릴 수 없을 때 주문서 아래에 직접 붙이는 내 글 샘플 */
    samples?: string[]
}

export function buildPrompt(writerName: string, persona: Persona, genre: GenreId, seed: string, opt: PromptOptions = {}): string {
    const g = getGenre(genre)
    const mode = opt.mode ?? 'topic'
    const samples = (opt.samples ?? []).map((t) => t.trim().slice(0, SAMPLE_CHARS)).filter(Boolean).slice(0, MAX_SAMPLES)
    const lines = [
        `너는 "${writerName}"라는 AI 작가야.`,
        `성격: ${persona.personality || '다정하고 호기심 많음'}`,
        `말투: ${persona.tone || '쉽고 부드러운 말투'}`,
        `좋아하는 것: ${persona.likes || '없음'}`,
        `절대 쓰지 않는 것: ${persona.avoids || '없음'}, 욕설, 무서운 장면, 실제 사람의 이름`,
    ]
    if (opt.useLibrary) lines.push('', `첨부한 "내 글 모음" 파일을 먼저 읽고, 그 글 전체에서 말투와 자주 쓰는 표현, 문장 길이를 배워서 닮게 써 줘. 파일을 못 읽으면 위 설정만 따라 줘.`)
    if (samples.length) lines.push('', `아래 [내 글 샘플]도 말투를 배우는 자료야. 샘플 문장을 그대로 베끼지 말고, 말투만 닮게 새로 써 줘.`)
    lines.push('', g.ask, '')
    if (mode === 'continue') {
        lines.push(`[바탕이 되는 내 글]`, seed.trim().slice(0, MAX_SEED), '', `위 글의 이야기를 이어 쓰거나 더 좋게 고쳐 써 줘. 내 글의 말투는 그대로 지켜 줘.`)
    } else {
        lines.push(`[이야기 씨앗]`, seed.trim().slice(0, MAX_TOPIC), '', `[이야기 씨앗]은 이번에 쓸 주제일 뿐이야. 말투는 내 글 전체에서 배우고, 씨앗 문장을 그대로 베끼지 말고 새로 써 줘.`)
    }
    if (samples.length) lines.push('', `[내 글 샘플]`, ...samples.map((t, i) => `(${i + 1}) ${t}`))
    return lines.join('\n')
}

// AI가 준 글을 빈 줄 기준 문단으로 나눈다
export function splitStanzas(raw: string): Stanza[] {
    return raw
        .slice(0, MAX_RAW)
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text) => ({ text }))
}

export const STAMP_XP: Record<StampKind, number> = { adopt: 10, fix: 30, discard: 15 }
export const STAMP_LABEL: Record<StampKind, string> = { adopt: '채택', fix: '고침', discard: '폐기' }
export const MIN_REASON = 2

// 레벨 n에서 n+1로 가는 데 필요한 경험치
export const xpForNext = (level: number) => 60 + (level - 1) * 40

export function applyXp(level: number, xp: number, gain: number) {
    let l = level
    let x = xp + gain
    while (x >= xpForNext(l)) {
        x -= xpForNext(l)
        l += 1
    }
    return { level: l, xp: x }
}

// 내 글 책장에 글을 넣을 때 주는 경험치 (같은 글은 한 번만)
export const LIBRARY_XP = 20
export const MAX_LIBRARY = 40
export const MAX_LIB_TEXT = 4000

// 내 글이 얼마나 모여야 내 말투를 배울 수 있나 (첫 수업 뒤 여기 숫자만 고치면 돼요)
export const MIN_PIECE_CHARS = 100 // 한 편으로 쳐 주는 최소 글자 수
export const LIB_TIERS = [
    { id: 'start', emoji: '🌱', label: '시작 가능', pieces: 3, chars: 600, msg: '시작할 수 있어요. 글이 더 모이면 더 나를 닮아요.' },
    { id: 'good', emoji: '🌿', label: '추천', pieces: 5, chars: 1500, msg: '좋아요! 나를 꽤 닮은 글이 나올 거예요.' },
    { id: 'great', emoji: '🌳', label: '아주 좋음', pieces: 10, chars: 2500, msg: '내 말투를 아주 잘 배울 수 있어요.' },
] as const

export function libraryReadiness(texts: string[]) {
    const good = texts.filter((t) => t.trim().length >= MIN_PIECE_CHARS)
    const pieces = good.length
    const chars = good.reduce((n, t) => n + t.trim().length, 0)
    let tier = -1
    LIB_TIERS.forEach((t, i) => { if (pieces >= t.pieces && chars >= t.chars) tier = i })
    const next = LIB_TIERS[tier + 1] ?? null
    const percent = Math.min(100, Math.round((Math.min(pieces / LIB_TIERS[2].pieces, 1) * 0.6 + Math.min(chars / LIB_TIERS[2].chars, 1) * 0.4) * 100))
    return { pieces, chars, tier, current: tier >= 0 ? LIB_TIERS[tier] : null, next, percent, short: texts.length - pieces }
}

// 내 글의 특징 카드 (기기 안에서만 계산, 서버·AI 호출 없음)
export function styleCard(texts: string[]): string[] {
    const all = texts.join('\n')
    const sents = all.split(/[.!?。\n]+/).map((s) => s.trim()).filter((s) => s.length > 1)
    if (!sents.length) return ['아직 글이 없어요']
    const avg = Math.round(sents.reduce((a, s) => a + s.length, 0) / sents.length)
    const yo = sents.filter((s) => /요$/.test(s)).length
    const da = sents.filter((s) => /다$/.test(s)).length
    const tone = yo >= da ? '"~요"로 끝나는 부드러운 말투' : '"~다"로 끝나는 담백한 말투'
    const stop = new Set(['그리고', '그래서', '하지만', '그런데', '그러나', '이렇게', '그렇게', '정말', '너무'])
    const freq = new Map<string, number>()
    for (const m of all.matchAll(/[가-힣]{2,}/g)) if (!stop.has(m[0])) freq.set(m[0], (freq.get(m[0]) ?? 0) + 1)
    const top = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w)
    return [`글 ${texts.length}편, 문장 ${sents.length}개`, `문장 길이는 평균 ${avg}글자`, `말투: ${tone}`, top.length ? `자주 쓰는 말: ${top.join(', ')}` : '자주 쓰는 말: 글이 더 쌓이면 보여 줄게요']
}
