import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/together.css'
import Footer from '../components/together/Footer'
import ChatRoom from '../components/together/ChatRoom'
import TeacherBoard from '../components/together/TeacherBoard'
import { relayJoin, loadSession, saveSession, clearSession, loadHistory, dropHistory, emojiOf, bgOf, type SavedSession } from '../lib/relay'

type View = 'enter' | 'teacher'

export default function Together() {
  const [session, setSession] = useState<SavedSession | null>(() => loadSession())
  const [view, setView] = useState<View>('enter')
  const [code, setCode] = useState('')
  const [nick, setNick] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const [hist, setHist] = useState<SavedSession[]>(() => loadHistory())

  // dead=true: 이 자리 열쇠가 더 이상 안 맞을 때 (선생님이 비웠거나 방이 끝남)
  const leave = (dead?: boolean) => {
    if (dead === true && session) dropHistory(session.code, session.token)
    clearSession(); setSession(null)
    setHist(loadHistory())
    setErr(dead === true ? '이 자리는 더 쓸 수 없어요. 같은 별명으로 다시 들어와 보세요.' : '')
  }

  async function join() {
    const c = code.trim()
    const n = nick.trim()
    if (!/^[0-9]{6}$/.test(c)) { setErr('방 번호는 숫자 6개예요.'); return }
    if (n.length < 1 || n.length > 8) { setErr('별명은 1~8글자로 써 주세요.'); return }
    setBusy(true); setErr('')
    try {
      const r = await relayJoin(c, n)
      const s: SavedSession = { code: c, token: r.token, nickname: n, seq: r.seq, emoji: r.emoji }
      saveSession(s)
      setSession(s)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요')
    } finally { setBusy(false) }
  }

  if (session) {
    return (
      <div className="tg">
        <ChatRoom session={session} onLeave={leave} />
        <Footer />
      </div>
    )
  }

  if (view === 'teacher') {
    return (
      <div className="tg">
        <TeacherBoard onBack={() => setView('enter')} />
        <Footer />
      </div>
    )
  }

  return (
    <div className="tg">
      <div className="wrap">
        <h1>✏️ 이야기 교실</h1>
        <p className="sub">친구들과 한 줄씩 번갈아 이야기를 이어 써요.</p>
        {hist.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <b>이 기기에서 들어갔던 자리</b>
            <p className="sub" style={{ margin: '4px 0 8px' }}>이름을 누르면 바로 이어서 들어가요.</p>
            <div className="row">
              {hist.map(h => (
                <button key={h.code + h.nickname} className="btn ghost" type="button"
                  onClick={() => { saveSession(h); setSession(h) }}>
                  <i style={{ background: bgOf(h.emoji), borderRadius: 6, padding: '0 4px', fontStyle: 'normal' }}>{emojiOf(h.emoji)}</i> {h.nickname} · 방 {h.code}
                </button>
              ))}
            </div>
          </div>
        )}
        <form className="card" onSubmit={e => { e.preventDefault(); void join() }}>
          <label className="fld" htmlFor="tg-code">① 선생님이 알려 준 방 번호</label>
          <input id="tg-code" className="codein" type="text" inputMode="numeric" autoComplete="off"
            maxLength={6} placeholder="000000" value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} />
          <label className="fld" htmlFor="tg-nick">② 내 별명 (8글자까지)</label>
          <input id="tg-nick" type="text" autoComplete="off" maxLength={8} placeholder="예: 하늘"
            value={nick} onChange={e => setNick(e.target.value)} />
          {err && <div className="err" role="alert">{err}</div>}
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn" type="submit" disabled={busy}>{busy ? '들어가는 중…' : '방에 들어가기'}</button>
          </div>
          <p className="sub" style={{ marginTop: 14 }}>이름 대신 별명을 써요. 진짜 이름·학교·전화번호는 쓰지 않아요.</p>
        </form>
        <div className="card" style={{ marginTop: 16 }}>
          <b>📖 혼자 글을 쓰고 싶나요?</b>
          <p className="sub" style={{ margin: '4px 0 12px' }}>작가의 책상에서 내 글을 쓰고, 내 서재에 책으로 꽂아 보세요.</p>
          <Link className="btn ghost" to="/desk">작가의 책상으로 가기 →</Link>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="link" type="button" onClick={() => setView('teacher')}>선생님이세요? 선생님 화면 열기</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
