import { useEffect, useMemo, useState } from 'react'
import '../styles/desk.css'
import Footer from '../components/together/Footer'
import DeskShelf from './DeskShelf'
import DeskCollect from './DeskCollect'
import { findSpellHints } from '../lib/spell'
import { Link } from 'react-router-dom'
import { useWriterStore } from '../store/writerStore'
import { MIN_PIECE_CHARS } from '../lib/writerPrompt'
import '../lib/classlog'
import {
  deskCreateAuthor, deskLogin, deskSave, deskGet, deskList, loadDeskSession, saveDeskSession, clearDeskSession,
  loadDeskDraft, saveDeskDraft, DESK_COLORS, DESK_GENRES,
  type DeskSession, type DeskPieceInput, type DeskPieceItem,
} from '../lib/desk'

type Tab = 'write' | 'review' | 'shelf' | 'all'

interface Mat { topic: string; who: string; what: string; mood: string }
const EMPTY_MAT: Mat = { topic: '', who: '', what: '', mood: '' }

const parseMat = (memo: string): Mat => {
  try { return { ...EMPTY_MAT, ...(JSON.parse(memo) as Partial<Mat>) } } catch { return { ...EMPTY_MAT } }
}

const blank = (): DeskPieceInput => ({
  id: null, title: '', genre: DESK_GENRES[0], memo: JSON.stringify(EMPTY_MAT),
  body: '', fav: '', color: DESK_COLORS[Math.floor(Math.random() * DESK_COLORS.length)], status: 'draft',
})

// 글을 문장 단위로 나눈다 (퇴고에서 "나다운 문장" 고르기용)
export const sentences = (text: string): string[] =>
  (text.match(/[^.?!\n]+[.?!”"’']*/g) ?? []).map(s => s.trim()).filter(Boolean)

// 저장된 글과 지금 글이 같은지 비교하는 지문 (바뀐 부분이 있는지 알려 주는 용도)
const sigOf = (p: DeskPieceInput) => JSON.stringify([p.title.trim(), p.genre, p.memo, p.body, p.fav])

const today = () => {
  const d = new Date()
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function Desk() {
  const [session, setSession] = useState<DeskSession | null>(() => loadDeskSession())
  const [tab, setTab] = useState<Tab>('write')
  const [piece, setPiece] = useState<DeskPieceInput>(() => loadDeskDraft() ?? blank())
  const [savedAt, setSavedAt] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const addToLibrary = useWriterStore(st => st.addToLibrary)
  const [shown, setShown] = useState('')
  // 지금 쓰는 글을 AI 작가 책장에 복사한다 (이 기기 안에만 저장, 서버 요청 없음)
  const showWriter = () => {
    const r = addToLibrary({ source: 'desk', ref: piece.id ?? `new:${piece.title.trim()}`, title: piece.title.trim() || '(제목 없음)', text: piece.body })
    setShown(r === 'full' ? 'AI 작가 책장이 가득 찼어요. AI 작가 방에서 오래된 글을 지워 주세요.' : r === 'updated' ? '책장의 글을 새 내용으로 바꿨어요.' : 'AI 작가에게 보여줬어요! 경험치도 받았어요.') + (piece.body.trim().length < MIN_PIECE_CHARS ? ` 그런데 ${MIN_PIECE_CHARS}자보다 짧아서 ‘내 글 편수’에는 아직 안 세요. 조금만 더 써 볼까요?` : '')
  }
  const [err, setErr] = useState('')
  // 마지막으로 서버에 저장하거나 불러온 모습. 지금 글과 다르면 "저장 안 됨"
  const [savedSig, setSavedSig] = useState('')
  const [pickOpen, setPickOpen] = useState(false)
  const [pickItems, setPickItems] = useState<DeskPieceItem[] | null>(null)
  const [pickErr, setPickErr] = useState('')

  // 쓰다 만 글은 이 기기에 임시로 남겨 둔다
  useEffect(() => { saveDeskDraft(piece) }, [piece])

  const hasContent = !!(piece.title.trim() || piece.body.trim())
  const unsaved = hasContent && sigOf(piece) !== savedSig

  const mat = useMemo(() => parseMat(piece.memo), [piece.memo])
  const [spellOn, setSpellOn] = useState(() => { try { return localStorage.getItem('desk.spell') !== 'off' } catch { return true } })
  const toggleSpell = () => setSpellOn(v => { try { localStorage.setItem('desk.spell', v ? 'off' : 'on') } catch { /* 무시 */ } return !v })
  const hints = useMemo(() => findSpellHints(piece.body), [piece.body])
  const applyHint = (h: { index: number; len: number; right: string }) =>
    setPiece(p => ({ ...p, body: p.body.slice(0, h.index) + h.right + p.body.slice(h.index + h.len) }))
  const setMat = (k: keyof Mat, v: string) => setPiece(p => ({ ...p, memo: JSON.stringify({ ...parseMat(p.memo), [k]: v }) }))
  const picks = useMemo(() => piece.fav.split('\n').filter(Boolean), [piece.fav])
  const sens = useMemo(() => sentences(piece.body), [piece.body])

  if (!session) {
    return <Gate onEnter={s => { saveDeskSession(s); setSession(s) }} />
  }

  const keyBad = err.includes('열쇠')
  const relogin = (
    <p>
      <button className="btn sub" type="button"
        onClick={() => { saveDeskDraft(piece); clearDeskSession(); setErr(''); setSession(null) }}>
        열쇠 코드를 다시 넣어 볼까요? (쓰던 글은 그대로 있어요)
      </button>
    </p>
  )

  const doSave = async (status: 'draft' | 'done') => {
    // 임시 저장은 제목이 없어도 되게 '제목 없음'으로 저장한다 (발행은 제목 필요)
    if (!piece.title.trim() && status === 'done') { setErr('제목을 먼저 지어 주세요'); return false }
    if (!piece.title.trim() && !piece.body.trim()) { setErr('제목이나 본문을 조금 써 주세요'); return false }
    const next: DeskPieceInput = { ...piece, title: piece.title.trim() || '제목 없음', status }
    setBusy(true); setErr('')
    try {
      const r = await deskSave(session.key, next)
      setPiece(p => ({ ...p, id: r.id, status, title: next.title }))
      setSavedSig(sigOf({ ...next, id: r.id }))
      setSavedAt('방금 저장했어요')
      return true
    } catch (e) {
      setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요')
      return false
    } finally { setBusy(false) }
  }

  const togglePick = (s: string) => {
    const has = picks.includes(s)
    const next = has ? picks.filter(x => x !== s) : [...picks, s]
    const joined = next.join('\n')
    if (joined.length > 200) { setErr('나다운 문장은 합쳐서 200자까지 모을 수 있어요'); return }
    setErr('')
    setPiece(p => ({ ...p, fav: joined }))
  }

  const publish = async () => {
    if (!piece.body.trim()) { setErr('본문을 먼저 써 주세요'); return }
    // 발행해도 책상은 비우지 않는다 (뒤로 와도 글이 보이게). 새 글은 '새 글 쓰기'로 시작
    if (await doSave('done')) setTab('shelf')
  }

  const newPiece = () => {
    if (unsaved && !window.confirm('지금 쓰던 글이 아직 저장되지 않았어요.\n그래도 새 글을 시작할까요?')) return
    saveDeskDraft(null); setPiece(blank()); setSavedSig(''); setSavedAt(''); setErr(''); setPickOpen(false); setTab('write')
  }

  // 서재에서 "고치기/이어 쓰기": 서버에서 글을 가져와 쓰는 화면으로
  const editPiece = async (id: string) => {
    // 쓰던 글이 저장 안 된 채로 다른 글을 열면 사라지니, 먼저 저장할지 물어본다
    if (unsaved && id !== piece.id) {
      if (!window.confirm('지금 쓰던 글이 아직 저장되지 않았어요.\n저장하고 다른 글을 열까요?\n\n(취소하면 그대로 있어요)')) return
      if (!(await doSave('draft'))) return
    }
    try {
      const g = await deskGet(session.key, id)
      setPiece({ id: g.id, title: g.title, genre: g.genre, memo: g.memo || JSON.stringify(EMPTY_MAT), body: g.body, fav: g.fav, color: g.color, status: g.status })
      setSavedSig(sigOf({ id: g.id, title: g.title, genre: g.genre, memo: g.memo || JSON.stringify(EMPTY_MAT), body: g.body, fav: g.fav, color: g.color, status: g.status }))
      setSavedAt(''); setErr(''); setTab('write'); setPickOpen(false)
    } catch (e) { setErr(e instanceof Error ? e.message : '글을 불러오지 못했어요') }
  }

  const openPicker = async () => {
    if (pickOpen) { setPickOpen(false); return }
    setPickOpen(true); setPickErr('')
    try { setPickItems(await deskList(session.key)) }
    catch (e) { setPickErr(e instanceof Error ? e.message : '목록을 불러오지 못했어요') }
  }

  const steps = [
    ['① 글감', !!mat.topic.trim()],
    ['② 제목', !!piece.title.trim()],
    ['③ 재료', !!(mat.who.trim() || mat.what.trim() || mat.mood.trim())],
    ['④ 본문', piece.body.trim().length > 30],
    ['⑤ 퇴고', picks.length > 0],
    ['⑥ 발행', piece.status === 'done'],
  ] as const
  const nowIdx = steps.findIndex(s => !s[1])

  return (
    <div className="dk">
      <div className="bar">
        <b>작가의 책상</b>
        <nav>
          {([['write', '쓰는 중'], ['review', '퇴고'], ['shelf', '내 서재'], ['all', '전체']] as const).map(([k, l]) => (
            <a key={k} className={tab === k ? 'on' : ''} role="button" tabIndex={0}
              onClick={() => setTab(k)} onKeyDown={e => { if (e.key === 'Enter') setTab(k) }}>{l}</a>
          ))}
        </nav>
        <span className="who">{session.nickname}
          <button className="btn sub" type="button" onClick={() => { clearDeskSession(); setSession(null) }}>나가기</button>
        </span>
      </div>
      {tab === 'write' && (
        <div className="stepwrap">
          <div className="stepbox">
            <div className="stepcap">
              {nowIdx < 0 ? '글 쓰는 순서 · 모두 끝났어요 🎉' : <>글 쓰는 순서 · 지금 {nowIdx + 1}단계<span className="sfx">예요</span></>}
            </div>
            <ol className="stp" aria-label="글 쓰는 순서">
              {steps.map(([l, done], i) => (
                <li key={l} className={done ? 'done' : i === nowIdx ? 'now' : ''} aria-current={i === nowIdx ? 'step' : undefined}>
                  <i aria-hidden="true">{done ? '✓' : i + 1}</i>
                  <span>{l.slice(2).trim()}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="main">
        <div className="stage">
          {tab === 'write' && (
            <>
              <aside className="mat">
                <h3>내 재료</h3>
                <p className="hint">글을 쓰다 막히지 않게 먼저 모아 두는 곳이에요. 본문을 쓰는 동안 옆에 계속 있어요. 비워 둬도 괜찮아요.</p>
                <details open><summary>글감 · 오늘의 장면</summary>
                  <input className="mi" value={mat.topic} maxLength={60} placeholder="예: 점심시간 피구"
                    onChange={e => setMat('topic', e.target.value)} /></details>
                <details><summary>누가·어디서</summary>
                  <input className="mi" value={mat.who} maxLength={60} placeholder="예: 나, 지우, 운동장"
                    onChange={e => setMat('who', e.target.value)} /></details>
                <details><summary>무슨 일이 있었나</summary>
                  <textarea className="mi" value={mat.what} maxLength={300} rows={3}
                    onChange={e => setMat('what', e.target.value)} /></details>
                <details><summary>글의 분위기</summary>
                  <input className="mi" value={mat.mood} maxLength={20} placeholder="예: 신나는"
                    onChange={e => setMat('mood', e.target.value)} /></details>
              </aside>
              <article className="ms">
                <div className="pick">
                  <button className="btn sub" type="button" onClick={() => void openPicker()} aria-expanded={pickOpen}>
                    {pickOpen ? '목록 닫기' : '이전에 쓴 글 불러오기'}
                  </button>
                  {pickOpen && (
                    <div className="pk-list">
                      {pickErr && <p role="alert" style={{ color: 'var(--red)' }}>{pickErr}</p>}
                      {!pickErr && pickItems === null && <p>불러오는 중…</p>}
                      {pickItems && pickItems.length === 0 && <p>아직 저장한 글이 없어요. '임시 저장'을 누르면 여기에 나타나요.</p>}
                      {pickItems && pickItems.map(it => (
                        <button key={it.id} type="button" className="pk-row" onClick={() => void editPiece(it.id)}>
                          <b>{it.title}</b>
                          <span>{it.genre} · {it.len}자 · {it.status === 'done' ? '발행함' : '쓰는 중'} · {new Date(it.updated_at).getMonth() + 1}월 {new Date(it.updated_at).getDate()}일</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="meta">
                  <div className="genre">
                    {DESK_GENRES.map(g => (
                      <a key={g} role="button" tabIndex={0} className={piece.genre === g ? 'on' : ''}
                        onClick={() => setPiece(p => ({ ...p, genre: g }))}>{g}</a>
                    ))}
                  </div>
                  <span>{today()} · 집필 중</span>
                </div>
                <input className="title" value={piece.title} maxLength={60} placeholder="제목을 지어 보세요"
                  aria-label="제목" onChange={e => setPiece(p => ({ ...p, title: e.target.value }))} />
                <div className="by">글 · {session.nickname}</div>
                <textarea className="body" value={piece.body} maxLength={20000} aria-label="본문"
                  placeholder="여기에 이야기를 써 보세요…" onChange={e => setPiece(p => ({ ...p, body: e.target.value }))} />
                <div className="spell">
                  <button type="button" className="sw" onClick={toggleSpell} aria-pressed={spellOn}>
                    맞춤법 힌트 {spellOn ? '켜짐' : '꺼짐'}
                  </button>
                  {spellOn && hints.length > 0 && (
                    <ul>
                      {hints.slice(0, 5).map(h => (
                        <li key={h.index + h.wrong}>
                          <span><s>{h.wrong}</s> → <b>{h.right}</b></span>
                          <small>{h.why}</small>
                          <button type="button" className="btn sub" onClick={() => applyHint(h)}>고치기</button>
                        </li>
                      ))}
                      {hints.length > 5 && <li><small>그 밖에 {hints.length - 5}개가 더 있어요. 위에서부터 고쳐 보세요.</small></li>}
                    </ul>
                  )}
                </div>
                {err && <p className="err" role="alert" style={{ color: 'var(--red)' }}>{err}</p>}
                {keyBad && relogin}
                {shown && <p role="status">{shown} <Link to="/writer">AI 작가 방으로 가기 →</Link></p>}
                <div className="ft">
                  <span>{piece.body.length}자 · 실명·학교·연락처는 쓰지 않아요 {unsaved ? <b className="unsaved">· 아직 저장 안 됨 (이 기기에만 있어요)</b> : (savedAt || savedSig) && <b className="saved">· {savedAt || '저장돼 있어요'}</b>}</span>
                  <span className="acts">
                    <button className="btn sub" type="button" onClick={newPiece}>새 글 쓰기</button>
                    <button className="btn sub" type="button" disabled={busy} onClick={() => void doSave('draft')}>{busy ? '저장 중…' : '임시 저장'}</button>
                    <button className="btn sub" type="button" disabled={piece.body.trim().length < 30} title="30글자 이상 써야 해요" onClick={showWriter}>AI 작가에게 보여주기</button>
                    <a role="button" tabIndex={0} onClick={() => setTab('review')}>다 썼어요, 퇴고하러 →</a>
                  </span>
                </div>
              </article>
            </>
          )}

          {tab === 'review' && (
            <>
              <aside className="mat">
                <h3>처음에 적은 내 재료</h3>
                <p className="hint">
                  {[mat.topic && `글감: ${mat.topic}`, mat.who && `누가·어디서: ${mat.who}`, mat.what && `일어난 일: ${mat.what}`, mat.mood && `분위기: ${mat.mood}`]
                    .filter(Boolean).map((t, i) => <span key={i} style={{ display: 'block' }}>{t}</span>)}
                  {!(mat.topic || mat.who || mat.what || mat.mood) && '적어 둔 재료가 없어요.'}
                </p>
                {mat.mood.trim() && <p className="hint"><b>{`'${mat.mood}'`}</b> 느낌이 글에 담겼는지 읽으면서 확인해요.</p>}
                <h3 style={{ marginTop: 18 }}>퇴고 순서</h3>
                <details open><summary>① 소리 내어 읽기</summary><p>어색한 곳은 손가락으로 짚어 봐요.</p></details>
                <details open><summary>② 마음에 드는 문장 고르기</summary><p>오른쪽 글에서 문장을 눌러요.</p></details>
                <details><summary>③ 제목 다시 보기</summary><p>글과 어울리는지 확인!</p></details>
              </aside>
              <article className="ms rv">
                <h2>{piece.title || '(제목 없음)'}</h2>
                <p>마음에 드는 문장을 눌러 "나다운 문장"으로 모아요.</p>
                {sens.length === 0 ? (
                  <p className="empty">아직 쓴 글이 없어요. '쓰는 중'에서 먼저 써 볼까요?</p>
                ) : (
                  <div className="txt">
                    {sens.map((s, i) => (
                      <span key={i}>
                        <mark className={picks.includes(s) ? 'pick' : ''} role="button" tabIndex={0}
                          onClick={() => togglePick(s)} onKeyDown={e => { if (e.key === 'Enter') togglePick(s) }}>{s}</mark>{' '}
                      </span>
                    ))}
                  </div>
                )}
                {spellOn && hints.length > 0 && (
                  <p className="empty" style={{ padding: '6px 0', color: 'var(--red)' }}>
                    맞춤법 힌트가 {hints.length}개 있어요. '쓰는 중'에서 확인해 보세요.
                  </p>
                )}
                <div className="q">
                  <h4>스스로 물어보기</h4>
                  <p>· 읽는 사람이 장면을 떠올릴 수 있나요?</p>
                  <p>· 반복되는 말은 없나요?</p>
                </div>
                {err && <p role="alert" style={{ color: 'var(--red)' }}>{err}</p>}
                {keyBad && relogin}
                <div className="ft">
                  <span>나다운 문장 {picks.length}개 선택됨</span>
                  <span className="acts">
                    <button className="btn sub" type="button" onClick={() => setTab('write')}>← 고쳐 쓰러 가기</button>
                    <a role="button" tabIndex={0} onClick={() => void publish()}>{busy ? '발행 중…' : '서재에 꽂기(발행) →'}</a>
                  </span>
                </div>
              </article>
            </>
          )}

          {tab === 'shelf' && (
            <>
              <p style={{ margin: '0 0 12px' }}><button className="btn sub" type="button" onClick={newPiece}>+ 새 글 쓰기</button></p>
              <DeskShelf session={session} onEdit={editPiece} />
            </>
          )}

          {tab === 'all' && <DeskCollect session={session} onEdit={editPiece} />}
        </div>
      </div>
      <Footer />
    </div>
  )
}

// ---- 입구: 새 작가 만들기 / 열쇠 코드로 들어가기 ----
function Gate({ onEnter }: { onEnter: (s: DeskSession) => void }) {
  const [mode, setMode] = useState<'new' | 'have'>('new')
  const [nick, setNick] = useState('')
  const [key, setKey] = useState('')
  const [issued, setIssued] = useState<DeskSession | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const create = async () => {
    if (!nick.trim()) { setErr('별명을 써 주세요'); return }
    setBusy(true); setErr('')
    try { setIssued(await deskCreateAuthor(nick.trim())) }
    catch (e) { setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요') }
    finally { setBusy(false) }
  }
  const login = async () => {
    setBusy(true); setErr('')
    try { const r = await deskLogin(key); onEnter({ key: key.trim(), nickname: r.nickname }) }
    catch (e) { setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요') }
    finally { setBusy(false) }
  }
  const copy = async () => {
    if (!issued) return
    try { await navigator.clipboard.writeText(issued.key); setCopied(true) } catch { setCopied(false) }
  }
  const download = () => {
    if (!issued) return
    const blob = new Blob([`작가의 책상 열쇠 코드: ${issued.key}\n별명: ${issued.nickname}\n(잃어버리면 글을 다시 열 수 없어요)\n`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = '작가의책상-열쇠코드.txt'; a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="dk">
      <div className="main gate">
        <h1>작가의 책상</h1>
        {issued ? (
          <>
            <p>이 열쇠 코드가 있어야 내 글을 다시 열 수 있어요. 꼭 적어 두세요!</p>
            <div className="sheet">
              <div className="keybox" aria-label="열쇠 코드">{issued.key}</div>
              <button className="btn" type="button" onClick={() => void copy()}>{copied ? '복사했어요 ✓' : '복사하기'}</button>{' '}
              <button className="btn" type="button" onClick={download}>파일로 저장</button>
              <p className="note">잃어버리면 선생님도 찾아 드릴 수 없어요. 종이에 적어 두면 가장 안전해요.</p>
            </div>
            <button className="btn" type="button" onClick={() => onEnter(issued)}>적어 뒀어요, 책상으로 →</button>
          </>
        ) : (
          <>
            <p>내 글을 쓰고, 서재에 꽂아 두는 나만의 책상이에요.</p>
            <div className="sheet">
              {mode === 'new' ? (
                <form onSubmit={e => { e.preventDefault(); void create() }}>
                  <label htmlFor="dk-nick">내 별명 (12글자까지)</label>
                  <input id="dk-nick" value={nick} maxLength={12} autoComplete="off" placeholder="예: 하늘"
                    onChange={e => setNick(e.target.value)} />
                  {err && <p className="err" role="alert">{err}</p>}
                  <button className="btn" type="submit" disabled={busy}>{busy ? '만드는 중…' : '내 책상 만들기 →'}</button>
                  <p className="note">진짜 이름·학교·전화번호는 쓰지 않아요. 별명만 써요.</p>
                </form>
              ) : (
                <form onSubmit={e => { e.preventDefault(); void login() }}>
                  <label htmlFor="dk-key">나만의 열쇠 코드</label>
                  <input id="dk-key" value={key} maxLength={12} autoComplete="off" placeholder="XXXXX-XXXXX"
                    onChange={e => setKey(e.target.value.toUpperCase())} />
                  {err && <p className="err" role="alert">{err}</p>}
                  <button className="btn" type="submit" disabled={busy}>{busy ? '여는 중…' : '내 책상 열기 →'}</button>
                </form>
              )}
            </div>
            <button className="btn sub" type="button" onClick={() => { setErr(''); setMode(mode === 'new' ? 'have' : 'new') }}>
              {mode === 'new' ? '이미 열쇠 코드가 있어요' : '처음이에요 (새로 만들기)'}
            </button>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
