import { useState, type ReactNode } from 'react'

export interface Choice { label: string; fn: () => void; ghost?: boolean }

// window.confirm 이 막힌 화면(앱 안 브라우저 등)에서도 되도록 화면 안에 묻는 상자를 띄운다
// ask: 네/아니요, choose: 고르기 버튼 여러 개 (+ 취소)
export function useAsk(): {
  ask: (msg: string, onYes: () => void) => void
  choose: (msg: string, choices: Choice[]) => void
  box: ReactNode
} {
  const [q, setQ] = useState<{ msg: string; choices: Choice[] } | null>(null)
  const box = q ? (
    <div className="card" role="alertdialog" aria-live="assertive" style={{ margin: '10px 0', borderColor: '#E8553E' }}>
      <p style={{ whiteSpace: 'pre-line', margin: '0 0 10px' }}>{q.msg}</p>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {q.choices.map(c => (
          <button key={c.label} className={c.ghost ? 'btn ghost' : 'btn'} type="button"
            onClick={() => { setQ(null); c.fn() }}>{c.label}</button>
        ))}
      </div>
    </div>
  ) : null
  return {
    ask: (msg, yes) => setQ({ msg, choices: [{ label: '네, 할게요', fn: yes }, { label: '아니요', fn: () => {}, ghost: true }] }),
    choose: (msg, choices) => setQ({ msg, choices: [...choices, { label: '취소', fn: () => {}, ghost: true }] }),
    box,
  }
}
