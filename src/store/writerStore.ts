import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EMPTY_STATS } from '../types/writer'
import type { GenreId, Look, Persona, QuestRecord, StampKind, Stats, Writer, WriterEventKind } from '../types/writer'
import { normalizeLook } from '../data/charParts'
import { applyXp, MIN_REASON, splitStanzas, STAMP_XP } from '../lib/writerPrompt'

// 1단계: 브라우저(localStorage)에 저장. DB 표 승인 후 같은 모양으로 Supabase에 옮긴다.
interface WriterState {
    writer: Writer | null
    quests: QuestRecord[]
    activeQuestId: string | null
    lastGain: { xp: number; levelUp: boolean } | null
    // 캐릭터 표정용 방금 일어난 일 (저장하지 않음)
    lastEvent: { kind: WriterEventKind; t: number } | null

    createWriter: (name: string, persona: Persona, look: Look) => void
    updateLook: (look: Look) => void
    startQuest: (genre: GenreId, prompt: string) => string
    setRawText: (questId: string, raw: string) => void
    stamp: (questId: string, index: number, kind: StampKind, reason: string, fixedText?: string) => boolean
    finishQuest: (questId: string) => void
    setActive: (id: string | null) => void
    reset: () => void
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

const STAT_BY_STAMP: Record<StampKind, keyof Stats> = { adopt: 'expression', fix: 'imagination', discard: 'judgment' }

export const useWriterStore = create<WriterState>()(
    persist(
        (set, get) => ({
            writer: null,
            quests: [],
            activeQuestId: null,
            lastGain: null,
            lastEvent: null,

            createWriter: (name, persona, look) =>
                set({
                    writer: { id: uid(), name, persona, look: normalizeLook(look), level: 1, xp: 0, stats: { ...EMPTY_STATS }, createdAt: new Date().toISOString() },
                }),

            updateLook: (look) => set((s) => (s.writer ? { writer: { ...s.writer, look: normalizeLook(look) } } : s)),

            startQuest: (genre, prompt) => {
                const w = get().writer
                const id = uid()
                const q: QuestRecord = { id, writerId: w?.id ?? '', genre, prompt, rawText: '', stanzas: [], status: 'writing', createdAt: new Date().toISOString() }
                set((s) => ({ quests: [...s.quests, q], activeQuestId: id }))
                return id
            },

            setRawText: (questId, raw) =>
                set((s) => ({
                    lastEvent: raw.trim() ? { kind: 'paste', t: Date.now() } : s.lastEvent,
                    quests: s.quests.map((q) => (q.id === questId ? { ...q, rawText: raw, stanzas: splitStanzas(raw), status: raw.trim() ? 'stamping' : 'writing' } : q)),
                })),

            // 이유가 너무 짧으면 도장을 찍지 않는다 (false 반환)
            stamp: (questId, index, kind, reason, fixedText) => {
                const r = reason.trim()
                if (r.length < MIN_REASON) return false
                const { writer, quests } = get()
                const q = quests.find((x) => x.id === questId)
                if (!writer || !q || !q.stanzas[index]) return false
                const first = !q.stanzas[index].stamp // 같은 문단을 다시 찍을 때는 경험치를 또 주지 않음
                const gain = first ? STAMP_XP[kind] : 0
                const { level, xp } = applyXp(writer.level, writer.xp, gain)
                const stats = { ...writer.stats }
                if (first) {
                    stats[STAT_BY_STAMP[kind]] += 1
                    stats.persistence += 1
                }
                set({
                    writer: { ...writer, level, xp, stats },
                    lastGain: { xp: gain, levelUp: level > writer.level },
                    lastEvent: { kind: level > writer.level ? 'levelup' : kind, t: Date.now() },
                    quests: quests.map((x) =>
                        x.id !== questId
                            ? x
                            : { ...x, stanzas: x.stanzas.map((st, i) => (i === index ? { ...st, stamp: kind, reason: r, fixedText: kind === 'fix' ? fixedText?.trim() || st.text : undefined } : st)) },
                    ),
                })
                return true
            },

            finishQuest: (questId) =>
                set((s) => ({ quests: s.quests.map((q) => (q.id === questId && q.stanzas.every((st) => st.stamp) ? { ...q, status: 'done' } : q)) })),

            setActive: (id) => set({ activeQuestId: id }),
            reset: () => set({ writer: null, quests: [], activeQuestId: null, lastGain: null, lastEvent: null }),
        }),
        { name: 'ai-writer-v1', partialize: (s) => ({ writer: s.writer, quests: s.quests, activeQuestId: s.activeQuestId }) },
    ),
)
