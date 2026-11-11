import type { Persona, Stanza, StampKind } from '../types/writer'
import { getGenre } from '../data/genres'
import type { GenreId } from '../types/writer'

export const MAX_SEED = 600
export const MAX_RAW = 4000

export function buildPrompt(writerName: string, persona: Persona, genre: GenreId, seed: string, useLibrary = false): string {
    const g = getGenre(genre)
    return [
        `너는 "${writerName}"라는 AI 작가야.`,
        `성격: ${persona.personality || '다정하고 호기심 많음'}`,
        `말투: ${persona.tone || '쉽고 부드러운 말투'}`,
        `좋아하는 것: ${persona.likes || '없음'}`,
        `절대 쓰지 않는 것: ${persona.avoids || '없음'}, 욕설, 무서운 장면, 실제 사람의 이름`,
        ...(useLibrary ? ['', `첨부한 "내 글 모음" 파일을 먼저 읽고, 그 글의 말투와 자주 쓰는 표현, 문장 길이를 닮게 써 줘. 파일을 못 읽으면 위 설정만 따라 줘.`] : []),
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

// 내 글 책장에 글을 넣을 때 주는 경험치 (같은 글은 한 번만)
export const LIBRARY_XP = 20
export const MAX_LIBRARY = 40
export const MAX_LIB_TEXT = 4000

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
