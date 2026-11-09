import { PARTS_BY_FIELD, normalizeLook } from '../data/charParts'
import type { Look, Mood, Persona, Temper, WriterEventKind } from '../types/writer'

export const LOOK_FIELDS = Object.keys(PARTS_BY_FIELD) as (keyof Look)[]

// 성격 글에서 낱말을 찾아 움직임 빠르기를 정한다
const CALM_RE = /차분|조용|느긋|온화|다정|부드러|침착|얌전|수줍|내성/
const LIVELY_RE = /활발|씩씩|명랑|에너지|신나|장난|용감|적극|밝/

export function getTemper(p: Persona | undefined): Temper {
    const t = `${p?.personality ?? ''} ${p?.tone ?? ''}`
    const lively = LIVELY_RE.test(t)
    const calm = CALM_RE.test(t)
    if (lively && !calm) return 'lively'
    if (calm && !lively) return 'calm'
    return 'normal'
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const open = (field: keyof Look, level: number) => PARTS_BY_FIELD[field].filter((p) => p.unlockLevel <= level).map((p) => p.id)
const has = (field: keyof Look, level: number, id: string) => open(field, level).includes(id)

// 성격 낱말 → 어울리는 부품 (열린 부품만 적용)
const RULES: { re: RegExp; why: string; set: Partial<Look> }[] = [
    { re: /차분|조용|느긋|온화|침착/, why: '차분해서 졸린 듯 편안한 눈과 단정한 입', set: { eyes: 'sleepy', mouth: 'smile', brows: 'normal' } },
    { re: /활발|씩씩|명랑|신나|에너지|장난/, why: '활발해서 웃는 눈과 활짝 웃는 입', set: { eyes: 'smile', mouth: 'grin', brows: 'up' } },
    { re: /똑똑|지혜|꼼꼼|논리|진지|박식/, why: '똑똑해 보이는 안경', set: { accessory: 'glasses', brows: 'thick', mouth: 'flat' } },
    { re: /다정|친절|따뜻|상냥|착한/, why: '다정해서 동글동글한 얼굴과 큰 눈', set: { face: 'round', eyes: 'big', mouth: 'smile', brows: 'sad' } },
    { re: /용감|씩씩|대담|당당|강한/, why: '용감해서 굵은 눈썹과 활짝 웃는 입', set: { brows: 'thick', mouth: 'grin', face: 'square' } },
    { re: /수줍|부끄|소심|내성/, why: '수줍어서 작은 입과 처진 눈썹', set: { mouth: 'small', brows: 'sad', eyes: 'dot' } },
    { re: /웃기|유머|재밌|개그/, why: '웃겨서 활짝 웃는 입과 웃는 눈', set: { mouth: 'grin', eyes: 'smile', accessory: 'freckle' } },
    { re: /멋|쿨|시크|도도/, why: '쿨해서 가는 눈과 일자 입', set: { eyes: 'narrow', mouth: 'flat', face: 'oval' } },
    { re: /꿈|상상|몽환|신비|마법/, why: '상상을 좋아해서 마법봉', set: { eyes: 'big', hold: 'wand', face: 'heart' } },
]
const LIKES: { re: RegExp; why: string; set: Partial<Look> }[] = [
    { re: /책|글|시|독서|공부/, why: '책을 좋아해서 공책', set: { hold: 'notebook' } },
    { re: /꽃|식물|봄|정원/, why: '꽃을 좋아해서 꽃핀', set: { hat: 'flower' } },
    { re: /음악|노래|춤|악기/, why: '음악을 좋아해서 헤드폰', set: { hat: 'phones' } },
    { re: /그림|미술|화가|예술/, why: '그림을 좋아해서 베레모', set: { hat: 'beret' } },
    { re: /왕|공주|왕자|성/, why: '이야기 속 왕족이 좋아서 작은 왕관', set: { hat: 'crown' } },
    { re: /겨울|추위|눈/, why: '겨울을 좋아해서 목도리', set: { accessory: 'scarf' } },
    { re: /모험|탐험|영웅|슈퍼/, why: '모험을 좋아해서 망토', set: { accessory: 'cape' } },
]

export function suggestLook(persona: Persona, current: Look, level: number): { look: Look; reasons: string[] } {
    const look = { ...current }
    const reasons: string[] = []
    const apply = (rules: typeof RULES, text: string) => {
        for (const r of rules) {
            if (!r.re.test(text)) continue
            let used = false
            for (const k of Object.keys(r.set) as (keyof Look)[]) {
                const v = r.set[k] as string
                if (has(k, level, v)) { look[k] = v as never; used = true }
            }
            if (used) reasons.push(r.why)
        }
    }
    apply(RULES, `${persona.personality} ${persona.tone}`)
    apply(LIKES, persona.likes)
    return { look: normalizeLook(look), reasons: reasons.slice(0, 4) }
}

const NONE_CHANCE = 0.4
function pickField(field: keyof Look, level: number): string {
    const ids = open(field, level)
    if ((field === 'hat' || field === 'accessory' || field === 'hold') && ids.includes('none') && Math.random() < NONE_CHANCE) return 'none'
    return pick(ids)
}

// slots를 주면 그 칸만, 없으면 전부 무작위. 열린 부품 안에서만 고른다
export function randomLook(level: number, current: Look, slots?: (keyof Look)[]): Look {
    const look = { ...current }
    const list = slots ?? LOOK_FIELDS
    for (const k of list) look[k] = pickField(k, level) as never
    // 성별이 바뀌었는데 머리가 기본값이면 성별에 어울리게
    if (list.includes('gender') && !list.includes('hair')) {
        if (look.gender === 'm' && look.hair === 'bob') look.hair = 'short'
        if (look.gender === 'f' && look.hair === 'short') look.hair = 'bob'
    }
    return normalizeLook(look)
}

// 성별 바꿀 때 머리 기본값 보정
export function withGender(look: Look, gender: Look['gender']): Look {
    const next = { ...look, gender }
    if (gender === 'm' && look.hair === 'bob') next.hair = 'short'
    if (gender === 'f' && look.hair === 'short') next.hair = 'bob'
    return next
}

// 일어난 일 → 캐릭터 기분
export const EVENT_MOOD: Record<WriterEventKind, Mood> = { adopt: 'happy', fix: 'fire', discard: 'worry', paste: 'surprise', levelup: 'fire' }

export const MOOD_LABEL: Record<Mood, string> = { idle: '기본', happy: '기쁨', think: '생각', surprise: '놀람', worry: '걱정', fire: '의욕' }

const LINES: Record<Exclude<Mood, 'idle'>, Record<Temper, string>> = {
    happy: { calm: '좋아요. 마음에 쏙 들어요.', normal: '와, 이 문장 마음에 들어요!', lively: '우와! 이거 너무 좋아요!' },
    think: { calm: '음… 천천히 살펴보고 있어요.', normal: '어떤 말이 좋을지 생각 중이에요.', lively: '으음~ 뭐가 좋을까, 생각 중!' },
    surprise: { calm: '어, 글이 들어왔네요.', normal: '앗, 새 글이 도착했어요!', lively: '헉! 글이 왔다!' },
    worry: { calm: '이 부분은… 조금 걱정돼요.', normal: '이 문장은 좀 걱정돼요…', lively: '어어, 이건 아니다 싶어요!' },
    fire: { calm: '조금 더 해 볼 마음이 생겼어요.', normal: '좋아요, 더 잘 고쳐 볼게요!', lively: '불타오른다! 다음 글도 가자!' },
}

export function moodLine(mood: Mood, temper: Temper): string | null {
    return mood === 'idle' ? null : LINES[mood][temper]
}
