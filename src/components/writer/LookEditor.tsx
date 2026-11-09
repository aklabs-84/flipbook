import { useState } from 'react'
import type { Look, Mood, Persona } from '../../types/writer'
import {
    ACC_PARTS, BODY_PARTS, BROWS_PARTS, EYES_PARTS, FACE_PARTS, GENDER_PARTS, HAIR_COLOR_PARTS, HAIR_PARTS,
    HAT_PARTS, HOLD_PARTS, MOUTH_PARTS, NOSE_PARTS, SKIN_PARTS, type Part,
} from '../../data/charParts'
import { MOOD_LABEL, randomLook, suggestLook, withGender } from '../../lib/writerLook'

interface RowDef { field: keyof Look; title: string; parts: Part[] }

const TABS: { id: string; label: string; rows: RowDef[] }[] = [
    { id: 'body', label: '몸', rows: [
        { field: 'gender', title: '성별', parts: GENDER_PARTS },
        { field: 'skin', title: '피부색', parts: SKIN_PARTS },
        { field: 'body', title: '옷 색깔', parts: BODY_PARTS },
    ] },
    { id: 'face', label: '얼굴', rows: [
        { field: 'face', title: '얼굴형', parts: FACE_PARTS },
        { field: 'eyes', title: '눈', parts: EYES_PARTS },
        { field: 'brows', title: '눈썹', parts: BROWS_PARTS },
        { field: 'nose', title: '코', parts: NOSE_PARTS },
        { field: 'mouth', title: '입', parts: MOUTH_PARTS },
    ] },
    { id: 'hair', label: '머리', rows: [
        { field: 'hair', title: '머리 모양', parts: HAIR_PARTS },
        { field: 'hairColor', title: '머리 색', parts: HAIR_COLOR_PARTS },
        { field: 'hat', title: '모자·머리핀', parts: HAT_PARTS },
    ] },
    { id: 'deco', label: '꾸미기', rows: [
        { field: 'accessory', title: '장신구', parts: ACC_PARTS },
        { field: 'hold', title: '손에 든 것', parts: HOLD_PARTS },
    ] },
]

const MOODS: Mood[] = ['idle', 'happy', 'think', 'surprise', 'worry', 'fire']

interface Props {
    look: Look
    level: number
    persona?: Persona
    onChange: (look: Look) => void
    // 기분 미리보기 (없으면 버튼을 숨긴다)
    mood?: Mood
    onMood?: (m: Mood) => void
}

export default function LookEditor({ look, level, persona, onChange, mood, onMood }: Props) {
    const [tab, setTab] = useState('body')
    const [reasons, setReasons] = useState<string[] | null>(null)
    const cur = TABS.find((t) => t.id === tab) ?? TABS[0]
    const canSuggest = !!persona && Object.values(persona).some((v) => v.trim())

    const set = (field: keyof Look, id: string) => {
        setReasons(null)
        onChange(field === 'gender' ? withGender(look, id as Look['gender']) : { ...look, [field]: id })
    }
    const rand = (slots?: (keyof Look)[]) => { setReasons(null); onChange(randomLook(level, look, slots)) }
    const suggest = () => {
        if (!persona) return
        const r = suggestLook(persona, look, level)
        onChange(r.look)
        setReasons(r.reasons.length ? r.reasons : ['성격 글에서 딱 맞는 낱말을 못 찾았어요. 성격을 조금 더 자세히 써 보세요.'])
    }

    return (
        <div className="look">
            <div className="tools">
                <button type="button" className="primary" onClick={() => rand()}>🎲 전체 랜덤</button>
                {canSuggest && <button type="button" onClick={suggest}>✨ 성격에 맞게 추천</button>}
            </div>
            {reasons && <p className="why">{reasons.join(' · ')}</p>}

            {onMood && (
                <div className="moods" role="group" aria-label="기분 미리보기">
                    <span>기분 보기</span>
                    {MOODS.map((m) => (
                        <button key={m} type="button" className={mood === m ? 'on' : ''} onClick={() => onMood(m)}>{MOOD_LABEL[m]}</button>
                    ))}
                </div>
            )}

            <div className="tabs" role="tablist">
                {TABS.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
            </div>

            {cur.rows.map((row) => (
                <div key={row.field}>
                    <div className="rowt">
                        <span>{row.title}</span>
                        {row.field !== 'gender' && <button type="button" onClick={() => rand([row.field])} aria-label={`${row.title} 랜덤`}>🎲</button>}
                    </div>
                    <div className="chips">
                        {row.parts.map((p) => {
                            const locked = p.unlockLevel > level
                            return (
                                <button key={p.id} type="button" disabled={locked} className={look[row.field] === p.id ? 'on' : ''} onClick={() => set(row.field, p.id)}>
                                    {p.color && <span className="sw" style={{ background: p.color }} />}
                                    {p.label}{locked ? ` (Lv.${p.unlockLevel})` : ''}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
