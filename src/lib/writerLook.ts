import type { Mood, Persona, Temper, WriterEventKind } from '../types/writer'

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
