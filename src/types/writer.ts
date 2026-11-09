export type GenreId = 'fairytale' | 'letter' | 'poem'

export type StampKind = 'adopt' | 'fix' | 'discard'

export interface Persona {
    personality: string
    tone: string
    likes: string
    avoids: string
}

// body = 옷 색깔. 나머지는 캐릭터 부품 id (src/data/charParts.ts)
export interface Look {
    gender: 'm' | 'f'
    skin: string
    face: string
    eyes: string
    brows: string
    nose: string
    mouth: string
    hair: string
    hairColor: string
    body: string
    hat: string
    accessory: string
    hold: string
}

export type Mood = 'idle' | 'happy' | 'think' | 'surprise' | 'worry' | 'fire'
export type Temper = 'calm' | 'normal' | 'lively'
export type WriterEventKind = 'adopt' | 'fix' | 'discard' | 'paste' | 'levelup'

export interface Stats {
    imagination: number
    expression: number
    judgment: number
    persistence: number
}

export interface Writer {
    id: string
    name: string
    persona: Persona
    look: Look
    level: number
    xp: number
    stats: Stats
    createdAt: string
}

export interface Stanza {
    text: string
    stamp?: StampKind
    reason?: string
    // 고침 도장일 때 학생이 고친 글. 없으면 text 그대로 쓴다
    fixedText?: string
}

export interface QuestRecord {
    id: string
    writerId: string
    genre: GenreId
    prompt: string
    rawText: string
    stanzas: Stanza[]
    status: 'writing' | 'stamping' | 'done'
    createdAt: string
}

export const EMPTY_STATS: Stats = { imagination: 0, expression: 0, judgment: 0, persistence: 0 }
