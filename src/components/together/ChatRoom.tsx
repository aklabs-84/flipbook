import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  relayCheck, relaySubmit, loadDraft, saveDraft, bgOf, emojiOf,
  type SavedSession, type RelayMember, type RelayLine, type RelayMode,
} from '../../lib/relay'
import StoryPanel from './StoryPanel'
import PageDecorator from './PageDecorator'
import { useAsk } from './useAsk'

type Phase = 'idle' | 'loading' | 'empty' | 'new' | 'fail'

interface Props { session: SavedSession; onLeave: (dead?: boolean) => void }

const MAX_LEN = 200

export default function ChatRoom({ session, onLeave }: Props) {
  const { code, token, seq: me } = session

  const [name, setName] = useState('')
  const [mode, setMode] = useState<RelayMode>('free')
  const [limit, setLimit] = useState(30)
  const [done, setDone] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [members, setMembers] = useState<RelayMember[]>([])
  const [lines, setLines] = useState<RelayLine[]>([])
  const [turn, setTurn] = useState(0)
  const [turnStart, setTurnStart] = useState<number>(Date.now())
  const [freshAfter, setFreshAfter] = useState<number>(Infinity)

  const [phase, setPhase] = useState<Phase>('loading')
  const [msg, setMsg] = useState('방에 들어가는 중…')
  const [lastAt, setLastAt] = useState(Date.now())
  const [cool, setCool] = useState(0)
  const [, forceTick] = useState(0)

  const [draft, setDraft] = useState(() => loadDraft(code))
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [view, setView] = useState<'chat' | 'pages'>('chat')
  const { ask, box: leaveBox } = useAsk()

  const verRef = useRef(-1)
  const sinceRef = useRef(0)
  const busyRef = useRef(false)
  const expiredFor = useRef<number>(0)
  const chatRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const coolTimer = useRef<number | undefined>(undefined)

  // ---- 화면 높이에 맞추기 (채팅 앱처럼 위는 안에서 스크롤, 아래 쓰기 칸 고정) ----
  useLayoutEffect(() => {
    const fit = () => {
      const el = rootRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.height = Math.max(420, window.innerHeight - top - 4) + 'px'
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const startCool = useCallback(() => {
    setCool(3)
    window.clearInterval(coolTimer.current)
    coolTimer.current = window.setInterval(() => {
      setCool(c => {
        if (c <= 1) { window.clearInterval(coolTimer.current); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])
  useEffect(() => () => window.clearInterval(coolTimer.current), [])

  // ---- 새 글 확인 ----
  const doCheck = useCallback(async (initial = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setPhase('loading')
    setMsg(initial ? '방에 들어가는 중…' : '친구 글 가져오는 중…')
    const t1 = window.setTimeout(() => setMsg('조금만 기다려 줘요…'), 2000)
    let t2 = 0
    try {
      const timeout = new Promise<never>((_, rej) => { t2 = window.setTimeout(() => rej(new Error('TIMEOUT')), 10000) })
      const r = await Promise.race([relayCheck(code, token, verRef.current, sinceRef.current), timeout])
      const when = Date.parse(r.turn_started_at)
      setTurn(r.turn)
      if (!Number.isNaN(when)) setTurnStart(when)
      setLastAt(Date.now())
      if (!r.changed) {
        verRef.current = r.ver
        const who = members.find(m => m.seq === r.turn)?.nickname ?? '친구'
        setPhase('empty')
        setMsg(r.turn === me ? '내 차례예요! ✏️ 아래 칸에 써 봐요.' : `아직 새 글이 없어요. ${who} 차례예요 ✏️`)
      } else {
        verRef.current = r.ver
        if (r.name) setName(r.name)
        setBookId(r.book ?? null)
        if (r.mode) setMode(r.mode)
        if (r.time_limit) setLimit(r.time_limit)
        setDone(r.status === 'done')
        if (r.members) setMembers(r.members)
        const incoming = (r.lines ?? []).filter(l => l.seq > sinceRef.current)
        const prevSince = sinceRef.current
        if (incoming.length) {
          sinceRef.current = Math.max(...incoming.map(l => l.seq))
          setLines(old => [...old, ...incoming])
        }
        setFreshAfter(initial ? Infinity : prevSince)
        const n = incoming.length
        setPhase('new')
        if (initial) setMsg('')
        else if (r.turn === me) setMsg(n ? `새 글 ${n}개! ✏️ 내 차례예요!` : '내 차례가 되었어요! ✏️')
        else setMsg(n ? `새 글 ${n}개를 가져왔어요.` : '차례가 바뀌었어요.')
      }
      startCool()
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      if (m.includes('친구가 아니에요') || m.includes('방을 찾을 수 없어요')) { onLeave(true); return }
      setPhase('fail')
      setMsg(m === 'TIMEOUT' ? '연결이 느려요. 다시 눌러 볼까요?' : '잘 안 됐어요. 다시 눌러 볼까요?')
    } finally {
      window.clearTimeout(t1); window.clearTimeout(t2)
      busyRef.current = false
    }
  }, [code, token, me, members, onLeave, startCool])

  // 처음 한 번만 자동으로 불러온다 (그 뒤에는 버튼을 눌러야 해요 — 요금·서버 부담을 줄이기 위해)
  useEffect(() => { void doCheck(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // "마지막 확인: 방금 / n초 전" 글자만 가끔 갱신 (서버 호출 없음)
  useEffect(() => {
    const id = window.setInterval(() => { if (phase !== 'loading') forceTick(x => x + 1) }, 5000)
    return () => window.clearInterval(id)
  }, [phase])

  // 채팅 맨 아래로
  useEffect(() => {
    const c = chatRef.current
    if (c) c.scrollTop = c.scrollHeight
  }, [lines])

  const myTurn = turn === me && !done
  const turnName = members.find(m => m.seq === turn)?.nickname ?? ''

  // ---- 도전 모드 카운트다운 (내 화면에서만 계산) ----
  useEffect(() => {
    if (mode !== 'challenge' || !myTurn) { setLeft(null); return }
    const tick = () => {
      const l = limit * 1000 - (Date.now() - turnStart)
      setLeft(l)
      if (l <= 0 && expiredFor.current !== turnStart) {
        expiredFor.current = turnStart
        setNotice('시간이 다 됐어요. 쓰던 글은 지우지 않고 보관했어요. 다음 내 차례에 이어 쓸 수 있어요.')
        // 서버에서 시간 초과를 정리해 주므로 한 번 확인만 한다
        window.setTimeout(() => { void doCheck() }, 800)
      }
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [mode, myTurn, limit, turnStart, doCheck])

  // 내 차례가 새로 오면 안내 문구 지우기
  useEffect(() => { if (myTurn && left !== null && left > 0) setNotice('') }, [myTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  function onDraft(v: string) {
    const t = v.slice(0, MAX_LEN)
    setDraft(t)
    saveDraft(code, t)
  }

  async function submit() {
    const t = draft.trim()
    if (!t) { setNotice('한 문장 이상 써 주세요.'); return }
    setSending(true); setNotice('')
    try {
      await relaySubmit(code, token, t)
      setDraft(''); saveDraft(code, '')
      await doCheck()
      setMsg('잘 보냈어요! 👍 다음 친구 차례예요.')
    } catch (e) {
      const m = e instanceof Error ? e.message : '잠시 후 다시 해 보세요'
      if (m.includes('내 차례가 아니')) {
        setNotice('시간이 지나 차례가 넘어갔어요. 쓰던 글은 여기에 보관했어요. 다음 내 차례에 이어 쓸 수 있어요.')
        void doCheck()
      } else setNotice(m)
    } finally { setSending(false) }
  }

  const loading = phase === 'loading'
  const ago = (() => {
    const s = Math.round((Date.now() - lastAt) / 1000)
    return s < 5 ? '방금' : s < 60 ? `${s}초 전` : `${Math.floor(s / 60)}분 전`
  })()
  const pct = left === null ? 100 : Math.max(0, (left / (limit * 1000)) * 100)

  if (view === 'pages') {
    return (
      <PageDecorator code={code} token={token} me={me}
        lines={lines} members={members}
        onRefreshLines={() => doCheck()}
        onBack={() => setView('chat')} />
    )
  }

  return (
    <div className="room" ref={rootRef}>
      <h2>
        {name || '함께 쓰는 방'}
        <span className="mode">{mode === 'challenge' ? `도전 모드 · 한 차례 ${limit}초` : '여유 모드 · 시간 제한 없음'}</span>
        <button className="fbtn" type="button" onClick={() => setStoryOpen(true)}>📖 전체 이야기</button>
        <button className="fbtn" style={{ display: 'inline-block' }} type="button" onClick={() => setView('pages')}>🎨 내 쪽 꾸미기</button>
        {bookId && <a className="fbtn" style={{ display: 'inline-block' }} href={`/view/${bookId}`} target="_blank" rel="noopener">📚 완성된 책 보기</a>}
        <button className="link" type="button" onClick={() => ask('이 방에서 나갈까요? (같은 별명으로 다시 들어오려면 선생님께 말해야 해요)', onLeave)}>나가기</button>
      </h2>
      {leaveBox}
      <p className="sub hide-m">친구가 글을 쓰면 [새 글 확인]을 눌러 가져와요. 내 차례가 되면 쓰기 칸이 열려요.</p>
      <div className="members">
        {members.map(m => (
          <div key={m.seq} className={`mem${m.seq === turn && !done ? ' turn' : ''}${m.seq === me ? ' me' : ''}`}>
            <i style={{ background: bgOf(m.emoji) }}>{emojiOf(m.emoji)}</i>
            <span>{m.nickname}{m.seq === turn && !done ? ' ✏️' : ''}</span>
          </div>
        ))}
      </div>

      <div className="cols">
        <div className="main">
          <div className="chat" ref={chatRef}>
            {lines.length === 0 && phase !== 'loading' && <div className="empty">아직 이야기가 시작되지 않았어요. 첫 번째 친구가 써 줄 거예요.</div>}
            {lines.map(l => {
              const f = l.seq > freshAfter ? ' fresh' : ''
              if (l.sys) return <div key={l.seq} className={`sys${f}`}>{l.t}</div>
              const m = members.find(x => x.seq === l.w)
              if (!m) return null
              const mine = m.seq === me
              return (
                <div key={l.seq} className={`msg${mine ? ' me' : ''}${f}`}>
                  <i style={{ background: bgOf(m.emoji) }}>{emojiOf(m.emoji)}</i>
                  <div>
                    <div className="nm">{m.nickname}</div>
                    <div className="bub">{l.t}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="chk">
            {loading ? (
              <>
                <button className="cbtn" disabled>가져오는 중…</button>
                <div className="pen" aria-hidden="true">
                  <svg viewBox="0 0 120 28"><path className="sq" d="M4 22 q10 -16 20 0 t20 0 t20 0 t20 0 t20 0" /></svg>
                  <span className="pencil">✏️</span>
                </div>
                <div className="cmsg" role="status">{msg}</div>
              </>
            ) : (
              <>
                {cool > 0
                  ? <button className="cbtn" disabled>잠깐 쉬어요 {cool}</button>
                  : phase === 'fail'
                    ? <button className="cbtn" onClick={() => void doCheck()}>🔁 다시 시도</button>
                    : <button className={`cbtn${phase === 'new' && myTurn ? ' glow' : ''}`} onClick={() => void doCheck()}>🔄 새 글 확인</button>}
                <div className={`cmsg${phase === 'fail' ? ' warn' : phase === 'new' ? ' good' : ''}`} role="status">
                  {msg || '친구가 쓴 글이 있는지 눌러서 확인해요.'}
                  <small>마지막 확인: {ago}</small>
                </div>
              </>
            )}
          </div>

          <div className={`write${myTurn ? ' mine' : ''}`}>
            {done ? (
              <b>이 방은 선생님이 마무리했어요. 이야기를 끝까지 읽어 봐요 📖</b>
            ) : !myTurn ? (
              <>
                <b>{turnName ? `지금은 ${turnName} 차례예요.` : '친구들이 모이는 중이에요.'}</b>
                <div className="sub" style={{ margin: '4px 0 0' }}>[새 글 확인]을 눌러 이야기가 이어졌는지 봐요.</div>
                {notice && <div className="notice">{notice}</div>}
              </>
            ) : (
              <>
                <b>✏️ 내 차례예요! 앞 이야기에 이어서 한 문장 이상 써 봐요.</b>
                {notice && <div className="notice">{notice}</div>}
                <textarea placeholder="여기에 이어 쓰세요…" value={draft} maxLength={MAX_LEN}
                  onChange={e => onDraft(e.target.value)} />
                <div className="row" style={{ marginTop: 8 }}>
                  {mode === 'challenge' ? (
                    <div className="timer">
                      <div className="bar"><b className={pct < 30 ? 'low' : ''} style={{ width: pct + '%' }} /></div>
                      <small>남은 시간 {Math.max(0, Math.ceil((left ?? 0) / 1000))}초</small>
                    </div>
                  ) : (
                    <small style={{ flex: 1, color: 'var(--mute)' }}>시간 제한이 없어요. 천천히 써요. ({draft.length}/{MAX_LEN})</small>
                  )}
                  <button className="send" onClick={() => void submit()} disabled={sending}>{sending ? '보내는 중…' : '보내기'}</button>
                </div>
              </>
            )}
          </div>
        </div>

        <StoryPanel lines={lines} members={members} me={me} open={storyOpen} onClose={() => setStoryOpen(false)} />
      </div>
    </div>
  )
}
