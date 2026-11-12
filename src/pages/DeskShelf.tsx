import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { deskList, deskGet, deskDelete, type DeskPieceItem, type DeskPiece, type DeskSession } from '../lib/desk'
import { getClassLogCtx, viaClassLog, submitToClass, CLASSLOG_URL } from '../lib/classlog'
import { useWriterStore } from '../store/writerStore'

// ---- 글을 책 쪽으로 나누기 ----
interface Line { t: string; dq: boolean }
type Para = Line[]
type Page = { kind: 'info' } | { kind: 'text'; paras: Para[]; first: boolean } | null

// 한 줄(문장) 단위로 나누고, 따옴표 대화문은 따로 표시
const toLines = (text: string): Line[] =>
  text.split('\n').flatMap(l =>
    (l.match(/[“"][^”"]*[”"][.?!]?|[^.?!“"]+[.?!]*/g) ?? [l])
      .map(z => z.trim()).filter(Boolean)
      .map(z => ({ t: z, dq: /^[“"]/.test(z) })))

const cost = (l: Line) => Math.ceil(l.t.length / 15)
const PAGE_CAP = 9

export function paginate(body: string): Page[] {
  const paras = body.split(/\n\s*\n/).map(toLines).filter(p => p.length)
  const out: { paras: Para[] }[] = []
  let cur: Para[] = []
  let used = 0
  const flush = () => { if (cur.length) out.push({ paras: cur }); cur = []; used = 0 }
  for (const p of paras) {
    let part: Line[] = []
    for (const l of p) {
      const c = cost(l)
      if (used + c > PAGE_CAP && (part.length || cur.length)) {
        if (part.length) { cur.push(part); part = [] }
        flush()
      }
      part.push(l); used += c
    }
    if (part.length) cur.push(part)
    used += 0.5
  }
  flush()
  const pages: Page[] = [{ kind: 'info' }, ...out.map((o, i) => ({ kind: 'text' as const, paras: o.paras, first: i === 0 }))]
  if (pages.length % 2) pages.push(null)
  return pages
}

const readMat = (memo: string): { topic?: string; mood?: string } => {
  try { return JSON.parse(memo) as { topic?: string; mood?: string } } catch { return {} }
}
const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일` }
// 책 제목 길이에 따라 글씨 크기 이름표(t1~t4)를 붙이고, 책등은 12글자까지만 보여줌
const tlen = (t: string) => { const n = [...(t || '(제목 없음)')].length; return n <= 7 ? 't1' : n <= 9 ? 't2' : n <= 12 ? 't3' : 't4' }
const spineTitle = (t: string) => { const a = [...(t || '(제목 없음)')]; return a.length > 12 ? a.slice(0, 11).join('') + '…' : a.join('') }
const mob = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width:700px)').matches

// ---- 서재 ----
export default function DeskShelf({ session, onEdit }: { session: DeskSession; onEdit: (id: string) => void }) {
  const [items, setItems] = useState<DeskPieceItem[] | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [reading, setReading] = useState<DeskPiece | null>(null)
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState(false)
  const [cl, setCl] = useState(false) // 클래스로그AI 안내 창
  const [sent, setSent] = useState('')
  const [sending, setSending] = useState(false)
  const [toWriter, setToWriter] = useState(false)
  const addToLibrary = useWriterStore(st => st.addToLibrary)

  const load = useCallback(async () => {
    try { setItems(await deskList(session.key)); setErr('') }
    catch (e) { setErr(e instanceof Error ? e.message : '서재를 불러오지 못했어요') }
  }, [session.key])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || reading) return
      if (ask) setAsk(false); else setSel(null)
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [reading, ask])

  if (err) return <div className="shelf view shelf on"><h2>내 서재</h2><p className="err" role="alert" style={{ color: 'var(--red)' }}>{err}</p></div>
  if (!items) return <div className="shelf view shelf on"><h2>내 서재</h2><p style={{ color: 'var(--mute)' }}>서재를 여는 중…</p></div>

  const done = items.filter(i => i.status === 'done')
  const drafts = items.filter(i => i.status === 'draft')
  const cur = items.find(i => i.id === sel) ?? null

  const pick = (id: string) => {
    if (sel === id) { setSel(null); setAsk(false) } else { setSel(id); setAsk(true) }
  }
  const submit = async () => {
    if (!cur) return
    const ctx = getClassLogCtx()
    if (!viaClassLog(ctx)) { setCl(true); return }
    if (!window.confirm(`'${cur.title || '(제목 없음)'}' 글을 선생님께 제출할까요?`)) return
    setSending(true); setSent('')
    try {
      await submitToClass(await deskGet(session.key, cur.id), ctx)
      setSent('✔ 선생님께 제출했어요. 고친 뒤 다시 내도 돼요.')
    } catch (e) { setSent(e instanceof Error ? e.message : '제출하지 못했어요') }
    finally { setSending(false) }
  }
  const showWriter = async () => {
    if (!cur) return
    if (cur.len < 30) { setSent('글이 아직 너무 짧아요. 조금 더 쓴 뒤에 AI 작가에게 보여줘요.'); return }
    setToWriter(true); setSent('')
    try {
      const g = await deskGet(session.key, cur.id)
      const r = addToLibrary({ source: 'desk', ref: g.id, title: g.title.trim() || '(제목 없음)', text: g.body })
      setSent(r === 'full'
        ? 'AI 작가 책장이 가득 찼어요. AI 작가 방에서 오래된 글을 지운 뒤 다시 해 보세요.'
        : r === 'updated' ? '✔ 이미 보여 준 글이라 내용만 바꿨어요.' : '✔ AI 작가에게 글을 보여줬어요.')
    } catch (e) { setSent(e instanceof Error ? e.message : '보여주지 못했어요') }
    finally { setToWriter(false) }
  }
  const open = async () => {
    if (!cur) return
    setAsk(false)
    setBusy(true)
    try { setReading(await deskGet(session.key, cur.id)) }
    catch (e) { setErr(e instanceof Error ? e.message : '글을 열지 못했어요') }
    finally { setBusy(false) }
  }
  const remove = async (it: DeskPieceItem) => {
    if (!window.confirm(`'${it.title || '(제목 없음)'}' 글을 지울까요? 지우면 되돌릴 수 없어요.`)) return
    try { await deskDelete(session.key, it.id); setSel(null); await load() }
    catch (e) { setErr(e instanceof Error ? e.message : '지우지 못했어요') }
  }

  const sub = (i: DeskPieceItem) => `${i.genre || '글'} · ${fmtDate(i.updated_at)} · ${i.len}자`

  return (
    <div className="view shelf on">
      <div>
        <h2>내 서재</h2>
        <p style={{ color: 'var(--mute)', margin: '0 0 18px' }}>
          {done.length ? '쓴 글이 한 권씩 꽂혀요. 책등에 마우스를 올려 보세요.' : '아직 꽂힌 책이 없어요. 글을 쓰고 퇴고한 뒤 "서재에 꽂기"를 눌러 보세요.'}
        </p>
      </div>
      <div className="case" onClick={() => setSel(null)}>
        <div className="spines">
          {done.map((b, n) => (
            <div key={b.id} className={'bk' + (sel === b.id ? ' sel' : '')} role="button" tabIndex={0}
              aria-label={`${b.title} 책`}
              style={{ '--t': `${40 + Math.min(Math.floor(b.len / 12), 40)}px`, '--h': `${185 + ((n * 37) % 50)}px`, '--d': '150px', '--c': b.color } as React.CSSProperties}
              onClick={e => { e.stopPropagation(); pick(b.id) }}
              onKeyDown={e => { if (e.key === 'Enter') pick(b.id) }}>
              <div className={'f sp ' + tlen(b.title)}><span>{spineTitle(b.title)}</span></div>
              <div className={'f cv ' + tlen(b.title)}><b>{b.title || '(제목 없음)'}</b><small>글 · {session.nickname}</small></div>
              <div className="f bc" /><div className="f pg" /><div className="f tp" />
            </div>
          ))}
        </div>
        <div className="board" />
      </div>

      <div className="det">
        {cur ? (
          <>
            <div><b>{cur.title || '(제목 없음)'}</b><span>{sub(cur)}</span></div>
            <span className="acts">
              <button className="btn sub" type="button" onClick={() => onEdit(cur.id)}>고치기</button>
              <button className="btn sub del" type="button" onClick={() => void remove(cur)}>🗑 지우기</button>
              <button className="btn sub" type="button" disabled={sending} onClick={() => void submit()}>{sending ? '내는 중…' : '선생님께 제출'}</button>
              <button className="btn sub" type="button" disabled={toWriter} onClick={() => void showWriter()}>{toWriter ? '보여주는 중…' : 'AI 작가에게 보여주기'}</button>
              <a role="button" tabIndex={0} onClick={() => void open()} onKeyDown={e => { if (e.key === 'Enter') void open() }}>
                {busy ? '여는 중…' : '펼쳐서 읽기 →'}
              </a>
            </span>
          </>
        ) : (
          <div><b>책을 눌러 보세요</b><span>마우스를 올리면 살짝 꺼내져요. 누르면 표지가 활짝 보여요. 한 번 더 누르면 제자리로 돌아가요.</span></div>
        )}
      </div>

      {sent && <p role="status" style={{ margin: '0 0 12px', color: sent.startsWith('✔') ? 'var(--pine)' : 'var(--red)' }}>{sent}</p>}

      {drafts.length > 0 && (
        <div className="row">
          <div>
            <b>쓰다 만 글 {drafts.length}편</b>
            {drafts.map(d => (
              <span key={d.id} style={{ display: 'block' }}>
                {d.title || '(제목 없음)'} · {d.len}자{' '}
                <button className="btn sub" type="button" onClick={() => onEdit(d.id)}>이어 쓰기</button>
                <button className="btn sub" type="button" onClick={() => void remove(d)}>지우기</button>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="row">
        <div><b>글 {done.length}편</b><span>10편이 넘으면 AI 작가를 키우기 좋아요.</span></div>
      </div>

      {ask && cur && !reading && (
        <div className="ask" onClick={() => setAsk(false)}>
          <div className="box" role="dialog" aria-modal="true" aria-label="책 펼치기" onClick={e => e.stopPropagation()}>
            <p>📖 「{cur.title || '(제목 없음)'}」<br />책을 펼쳐서 읽어 볼까요?</p>
            <div>
              <button className="btn" type="button" autoFocus onClick={() => void open()}>읽기</button>
              <button className="btn sub" type="button" onClick={() => setAsk(false)}>아니요</button>
            </div>
          </div>
        </div>
      )}

      {cl && (
        <div className="ask" onClick={() => setCl(false)}>
          <div className="box" role="dialog" aria-modal="true" aria-label="클래스로그AI 안내" onClick={e => e.stopPropagation()}>
            <p>클래스로그AI로 들어와야<br />글이 제출돼요</p>
            <small>내 글이 내 이름으로 선생님께 바로 도착해요. 지금 이 화면의 글은 서재에 안전하게 있어요.</small>
            <div>
              <a className="btn" href={CLASSLOG_URL} target="_blank" rel="noopener">클래스로그AI로 입장하기</a>
              <button className="btn sub" type="button" onClick={() => setCl(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {reading && <Reader piece={reading} nickname={session.nickname} onClose={() => setReading(null)} />}
    </div>
  )
}

// ---- 펼쳐서 읽기 ----
function Reader({ piece, nickname, onClose }: { piece: DeskPiece; nickname: string; onClose: () => void }) {
  const pages = useRef<Page[]>(paginate(piece.body)).current
  const mt = readMat(piece.memo)
  const picks = piece.fav.split('\n').filter(Boolean)
  const total = Math.ceil(pages.length / 2)
  const [rs, setRs] = useState(0)
  const [opened, setOpened] = useState(false)
  const [leaf, setLeaf] = useState<{ dir: 1 | -1; t: number; go: boolean } | null>(null)
  const busy = useRef(false)

  useEffect(() => { const id = setTimeout(() => setOpened(true), 500); return () => clearTimeout(id) }, [])

  const flip = useCallback((dir: 1 | -1) => {
    const t = rs + dir
    if (busy.current || t < 0 || t >= total) return
    if (mob()) { setRs(t); return }
    busy.current = true
    setLeaf({ dir, t, go: false })
    requestAnimationFrame(() => requestAnimationFrame(() => setLeaf(l => (l ? { ...l, go: true } : l))))
    setTimeout(() => { setRs(t); setLeaf(null); busy.current = false }, 980)
  }, [rs, total])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') flip(1)
      if (e.key === 'ArrowLeft') flip(-1)
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [flip, onClose])

  const Pg = (i: number, num = true): ReactNode => {
    const p = pages[i]
    if (!p) return null
    const n = num ? <div className="pn">{i + 1}</div> : null
    if (p.kind === 'info') return (
      <>
        <div className="tag">{piece.genre || '글'} · {fmtDate(piece.created_at)}</div>
        <h3>{piece.title || '(제목 없음)'}</h3>
        <div className="by2">글 · {nickname}</div>
        {(mt.topic || mt.mood) && (
          <div className="by2">{[mt.topic && `글감 · ${mt.topic}`, mt.mood && `분위기 · ${mt.mood}`].filter(Boolean).join('  ·  ')}</div>
        )}
        <span className="orn">◆ ◆ ◆</span>
        {picks.length > 0 && (
          <div className="qt"><small>내가 고른 나다운 문장</small>{picks.map((q, k) => <div key={k}>“{q}”</div>)}</div>
        )}
        {n}
      </>
    )
    return (
      <>
        {p.paras.map((para, k) => (
          <p key={k} className={p.first && k === 0 ? 'first' : undefined}>
            {para.map((l, j) => <span key={j} className={'ln' + (l.dq ? ' dq' : '')}>{l.t}</span>)}
          </p>
        ))}
        {n}
      </>
    )
  }

  // 넘기는 동안 보이는 쪽: 앞으로 넘기면 오른쪽만, 뒤로 넘기면 왼쪽만 먼저 바뀐다
  const li = leaf ? (leaf.dir > 0 ? rs * 2 : leaf.t * 2) : rs * 2
  const ri = leaf ? (leaf.dir > 0 ? leaf.t * 2 + 1 : rs * 2 + 1) : rs * 2 + 1
  const m = mob()
  const end = <div className="end">— 끝 —</div>
  const base = 'translateZ(3px) '

  return (
    <div className="rd on" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'rbook' + (opened ? ' open' : '')} style={{ '--c': piece.color } as React.CSSProperties}>
        <div className="rp pgbase">
          {m ? <>{Pg(rs * 2)}{Pg(rs * 2 + 1, false)}</> : (ri < pages.length && pages[ri] ? Pg(ri) : end)}
        </div>
        <div className="cov">
          <div className="cf"><b>{piece.title || '(제목 없음)'}</b><small>글 · {nickname}</small></div>
          <div className="cb pgbase">{m ? null : Pg(li)}</div>
        </div>
        {leaf && (
          <div className="leaf"
            style={{ transform: base + (leaf.go === (leaf.dir > 0) ? 'rotateY(-180deg)' : 'rotateY(0deg)') }}>
            <div className="lf pgbase">{Pg(leaf.dir > 0 ? rs * 2 + 1 : leaf.t * 2 + 1) ?? end}</div>
            <div className="lb pgbase">{Pg(leaf.dir > 0 ? leaf.t * 2 : rs * 2)}</div>
          </div>
        )}
      </div>
      <div className="rn">
        <button type="button" disabled={rs === 0} onClick={() => flip(-1)}>← 앞 쪽</button>
        <span>{rs + 1} / {total}</span>
        <button type="button" disabled={rs >= total - 1} onClick={() => flip(1)}>다음 쪽 →</button>
        <button type="button" onClick={onClose}>닫기 ✕</button>
      </div>
    </div>
  )
}
