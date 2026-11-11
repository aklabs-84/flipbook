export type GenreId = 'fairytale' | 'letter' | 'poem'

export type StampKind = 'adopt' | 'fix' | 'discard'

export interface Persona {
    personality: string
    tone: string
    likes: string
    avoids: string
}

// 작가 친구의 모습. kind: 사람 친구('person') / 도구 친구('tool')
// base: 사람은 머리 모양(bob·buns·tuft·short), 도구는 연필·책·잉크병(pencil·book·ink)
// skin·body·hairColor는 색(#RRGGBB), deco는 껴 놓은 꾸미기 id 목록 (src/data/charParts.ts)
export interface Look {
    kind: 'person' | 'tool'
    gender: 'm' | 'f'
    base: string
    hairColor: string
    skin: string
    body: string
    deco: string[]
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

// 내 글 책장: 책상·이야기 교실에서 가져온 글. 이 기기(localStorage)에만 있다
export interface LibraryItem {
    id: string
    source: 'desk' | 'together'
    // 같은 글을 두 번 넣지 않기 위한 표 (책상 글 id / 방 번호)
    ref: string
    title: string
    text: string
    addedAt: string
}
