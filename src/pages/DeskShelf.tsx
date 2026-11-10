import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { deskList, deskGet, deskDelete, type DeskPieceItem, type DeskPiece, type DeskSession } from '../lib/desk'

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
const mob = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width:700px)').matches

// ---- 서재 ----
export default function DeskShelf({ session, onEdit }: { session: DeskSession; onEdit: (id: string) => void }) {
  const [items, setItems] = useState<DeskPieceItem[] | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [reading, setReading] = useState<DeskPiece | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setItems(await deskList(session.key)); setErr('') }
    catch (e) { setErr(e instanceof Error ? e.message : '서재를 불러오지 못했어요') }
  }, [session.key])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !reading) setSel(null) }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [reading])

  if (err) return <div className="shelf view shelf on"><h2>내 서재</h2><p className="err" role="alert" style={{ color: 'var(--red)' }}>{err}</p></div>
  if (!items) return <div className="shelf view shelf on"><h2>내 서재</h2><p style={{ color: 'var(--mute)' }}>서재를 여는 중…</p></div>

  const done = items.filter(i => i.status === 'done')
  const drafts = items.filter(i => i.status === 'draft')
  const cur = items.find(i => i.id === sel) ?? null

  const open = async () => {
    if (!cur) return
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
              onClick={e => { e.stopPropagation(); setSel(sel === b.id ? null : b.id) }}
              onKeyDown={e => { if (e.key === 'Enter') setSel(sel === b.id ? null : b.id) }}>
              <div className="f sp"><span>{b.title || '(제목 없음)'}</span></div>
              <div className="f cv"><b>{b.title || '(제목 없음)'}</b><small>글 · {session.nickname}</small></div>
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
              <button className="btn sub" type="button" onClick={() => void remove(cur)}>지우기</button>
              <a role="button" tabIndex={0} onClick={() => void open()} onKeyDown={e => { if (e.key === 'Enter') void open() }}>
                {busy ? '여는 중…' : '펼쳐서 읽기 →'}
              </a>
            </span>
          </>
        ) : (
          <div><b>책을 눌러 보세요</b><span>마우스를 올리면 살짝 꺼내져요. 누르면 표지가 활짝 보여요. 한 번 더 누르면 제자리로 돌아가요.</span></div>
        )}
      </div>

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
