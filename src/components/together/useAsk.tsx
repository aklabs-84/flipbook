import { useState, type ReactNode } from 'react'

// window.confirm 이 막힌 화면(앱 안 브라우저 등)에서도 되도록 화면 안에 묻는 상자를 띄운다
export function useAsk(): { ask: (msg: string, onYes: () => void) => void; box: ReactNode } {
  const [q, setQ] = useState<{ msg: string; yes: () => void } | null>(null)
  const box = q ? (
    <div className="card" role="alertdialog" aria-live="assertive" style={{ margin: '10px 0', borderColor: '#E8553E' }}>
      <p style={{ whiteSpace: 'pre-line', margin: '0 0 10px' }}>{q.msg}</p>
      <div className="row">
        <button className="btn" type="button" onClick={() => { const f = q.yes; setQ(null); f() }}>네, 할게요</button>
        <button className="btn ghost" type="button" onClick={() => setQ(null)}>아니요</button>
      </div>
    </div>
  ) : null
  return { ask: (msg, yes) => setQ({ msg, yes }), box }
}
