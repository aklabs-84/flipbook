import type { Look, Mood } from '../../types/writer'
import { COLORS, DECOS, SKINS } from '../../data/charParts'
import { MOOD_LABEL } from '../../lib/writerLook'

const MOODS: Mood[] = ['idle', 'happy', 'think', 'surprise', 'worry', 'fire']

interface Props {
    look: Look
    level: number
    onChange: (look: Look) => void
    // 기분 미리보기 (없으면 버튼을 숨긴다)
    mood?: Mood
    onMood?: (m: Mood) => void
}

// 고칠 수 있는 것은 4가지뿐: 기분 보기 · 피부색(사람만) · 옷/몸 색 · 꾸미기
export default function LookEditor({ look, level, onChange, onMood }: Props) {
    const isTool = look.kind === 'tool'
    const decos = DECOS.filter((d) => d.kinds.includes(look.kind))
    const toggle = (id: string) => {
        const on = look.deco.includes(id)
        onChange({ ...look, deco: on ? look.deco.filter((d) => d !== id) : [...look.deco, id] })
    }

    return (
        <div className="look">
            {onMood && (
                <div className="moods" role="group" aria-label="평소 표정 고르기">
                    <span>평소 표정</span>
                    {MOODS.map((m) => (
                        <button key={m} type="button" className={(look.rest ?? 'idle') === m ? 'on' : ''} onClick={() => { onChange({ ...look, rest: m === 'idle' ? undefined : m }); onMood(m) }}>{MOOD_LABEL[m]}</button>
                    ))}
                    <small style={{ flexBasis: '100%', color: 'var(--ink-3, #7a6a5a)' }}>고른 표정이 방에서 쉬고 있을 때의 얼굴이에요. 도장을 찍으면 잠깐 바뀌었다가 돌아와요.</small>
                </div>
            )}

            {!isTool && (
                <>
                    <div className="rowt"><span>피부색</span></div>
                    <div className="swatches">
                        {SKINS.map((s) => (
                            <button key={s.color} type="button" className={look.skin === s.color ? 'on' : ''} aria-label={s.label} title={s.label}
                                style={{ background: s.color }} onClick={() => onChange({ ...look, skin: s.color })} />
                        ))}
                    </div>
                </>
            )}

            <div className="rowt"><span>{isTool ? '몸 색깔' : '옷 색깔'}</span></div>
            <div className="swatches">
                {COLORS.map((c) => (
                    <button key={c.color} type="button" className={look.body === c.color ? 'on' : ''} aria-label={c.label} title={c.label}
                        style={{ background: c.color }} onClick={() => onChange({ ...look, body: c.color })} />
                ))}
            </div>

            <div className="rowt"><span>꾸미기</span></div>
            <div className="chips">
                {decos.map((d) => {
                    const locked = d.unlockLevel > level
                    const on = look.deco.includes(d.id)
                    return (
                        <button key={d.id} type="button" disabled={locked && !on} className={on ? 'on' : ''} onClick={() => toggle(d.id)}>
                            {d.label}{locked && !on ? ` 🔒 Lv.${d.unlockLevel}` : ''}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
