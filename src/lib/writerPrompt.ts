import type { Persona, Stanza, StampKind } from '../types/writer'
import { getGenre } from '../data/genres'
import type { GenreId } from '../types/writer'

export const MAX_SEED = 600
export const MAX_RAW = 4000

export function buildPrompt(writerName: string, persona: Persona, genre: GenreId, seed: string): string {
    const g = getGenre(genre)
    return [
        `너는 "${writerName}"라는 AI 작가야.`,
        `성격: ${persona.personality || '다정하고 호기심 많음'}`,
        `말투: ${persona.tone || '쉽고 부드러운 말투'}`,
        `좋아하는 것: ${persona.likes || '없음'}`,
        `절대 쓰지 않는 것: ${persona.avoids || '없음'}, 욕설, 무서운 장면, 실제 사람의 이름`,
        '',
        g.ask,
        '',
        `[이야기 씨앗]`,
        seed.trim().slice(0, MAX_SEED),
    ].join('\n')
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
