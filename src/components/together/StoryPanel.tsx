import { useEffect, useRef, useState } from 'react'
import { bgOf, emojiOf, type RelayLine, type RelayMember } from '../../lib/relay'

interface Props {
  lines: RelayLine[]
  members: RelayMember[]
  me: number
  open: boolean      // 좁은 화면에서 아래에서 올라오는 창이 열렸는지
  onClose: () => void
}

export default function StoryPanel({ lines, members, me, open, onClose }: Props) {
  const [view, setView] = useState<1 | 2>(1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const story = lines.filter(l => !l.sys && l.w !== null)

  useEffect(() => {
    const b = bodyRef.current
    if (b) b.scrollTop = b.scrollHeight
  }, [story.length, view, open])

  const who = (w: number | null) => members.find(m => m.seq === w)

  return (
    <aside className={`full${open ? ' open' : ''}`} aria-label="지금까지 이야기">
      <div className="fh">
        <b>📖 지금까지 이야기</b>
        <span>{story.length}줄</span>
        <button className="fclose" type="button" onClick={onClose}>닫기 ✕</button>
      </div>
      <div className="fview">
        <button type="button" className={view === 1 ? 'on' : ''} onClick={() => setView(1)}>👥 친구별로 보기</button>
        <button type="button" className={view === 2 ? 'on' : ''} onClick={() => setView(2)}>📄 이어서 읽기</button>
      </div>
      <div className="fb" ref={bodyRef}>
        {story.length === 0 && <div className="empty">아직 쓴 글이 없어요.</div>}
        {view === 1
          ? story.map((l, i) => {
              const m = who(l.w)
              if (!m) return null
              const mine = m.seq === me
              return (
                <div key={l.seq} className={`fr${mine ? ' mine' : ''}`}>
                  <i style={{ background: bgOf(m.emoji) }}>{emojiOf(m.emoji)}<b>{i + 1}</b></i>
                  <div>
                    <div className="who">{m.nickname}{mine ? ' (나)' : ''}</div>
                    <p>{l.t}</p>
                  </div>
                </div>
              )
            })
          : (
            <div className="ff">
              {story.map((l, i) => {
                const m = who(l.w)
                if (!m) return null
                return (
                  <span key={l.seq} className={`s${m.seq === me ? ' mine' : ''}`}
                    style={{ ['--c' as string]: bgOf(m.emoji) }} title={m.nickname}>
                    <sup>{i + 1}</sup>{l.t}
                  </span>
                )
              })}
            </div>
          )}
      </div>
    </aside>
  )
}
