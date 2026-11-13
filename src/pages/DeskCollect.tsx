import { useCallback, useEffect, useMemo, useState } from 'react'
import { deskGet, deskList, deskDelete, type DeskPieceItem, type DeskSession } from '../lib/desk'
import { useWriterStore } from '../store/writerStore'
import DeskSubmit from './DeskSubmit'

const MIN_SEND = 30 // '쓰는 중'의 "AI 작가에게 보여주기"와 같은 기준
const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일` }

// 내가 쓴 글을 한 줄씩 모아 보고, 골라서 한 번에 AI 작가에게 보내는 목록
export default function DeskCollect({ session, onEdit }: { session: DeskSession; onEdit: (id: string) => void }) {
  const addToLibrary = useWriterStore(st => st.addToLibrary)
  const [items, setItems] = useState<DeskPieceItem[] | null>(null)
  const [err, setErr] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [selecting, setSelecting] = useState(false)

  const load = useCallback(async () => {
    try { setItems(await deskList(session.key)); setErr('') }
    catch (e) { setErr(e instanceof Error ? e.message : '글 목록을 불러오지 못했어요') }
  }, [session.key])
  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => [...(items ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [items])

  const remove = async (i: DeskPieceItem) => {
    if (!window.confirm(`'${i.title || '(제목 없음)'}' 글을 지울까요? 지우면 되돌릴 수 없어요.`)) return
    setBusy(true)
    try {
      await deskDelete(session.key, i.id)
      setPicked(p => p.filter(x => x !== i.id))
      setMsg('')
      await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : '지우지 못했어요') }
    finally { setBusy(false) }
  }
  const ok = (i: DeskPieceItem) => i.len >= MIN_SEND
  const okIds = rows.filter(ok).map(i => i.id)
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  const allOn = okIds.length > 0 && okIds.every(id => picked.includes(id))

  const send = async () => {
    if (!picked.length || busy) return
    setBusy(true); setMsg('')
    let added = 0, updated = 0, failed = 0, full = false, done = 0
    for (const id of picked) {
      try {
        const g = await deskGet(session.key, id) // 한 번에 하나씩 순서대로
        const r = addToLibrary({ source: 'desk', ref: g.id, title: g.title.trim() || '(제목 없음)', text: g.body })
        if (r === 'full') { full = true; break }
        if (r === 'added') added++; else updated++
        done++
      } catch { failed++ }
      setMsg(`보내는 중… ${done + failed}/${picked.length}`)
    }
    const parts = [`✔ ${added + updated}편을 AI 작가에게 보여줬어요`]
    if (updated) parts.push(`${updated}편은 이미 있어서 내용만 바꿨어요`)
    if (failed) parts.push(`${failed}편은 불러오지 못했어요`)
    if (full) parts.push('AI 작가 책장이 가득 차서 나머지는 못 보냈어요. AI 작가 방에서 오래된 글을 지워 주세요')
    setMsg(parts.join(' · '))
    setPicked([]); setBusy(false); setSelecting(false)
  }

  if (err) return <div className="collect"><h2>전체 글</h2><p role="alert" style={{ color: 'var(--red)' }}>{err}</p></div>
  if (!items) return <div className="collect"><h2>전체 글</h2><p style={{ color: 'var(--mute)' }}>글을 불러오는 중…</p></div>

  const stop = () => { setSelecting(false); setPicked([]); setMsg('') }

  return (
    <div className="collect">
      <div className="chead">
        <div>
          <h2>내가 쓴 글 {rows.length}편</h2>
          <p className="cdesc">쓴 글을 보고, 고치고, 지울 수 있어요.</p>
        </div>
        {!selecting && rows.length > 0 && (
          <button className="btn" type="button" onClick={() => { setSelecting(true); setMsg('') }}>AI 작가에게 보내기</button>
        )}
      </div>
      {selecting && (
        <div className="cbanner" role="status">
          <b>보낼 글을 골라요.</b> 지금 {picked.length}편 골랐어요.
          <label className="all">
            <input type="checkbox" checked={allOn} disabled={!okIds.length || busy} onChange={() => setPicked(allOn ? [] : okIds)} />
            <span>전체 선택</span>
          </label>
        </div>
      )}
      {msg && <p role="status" className="cmsg" style={{ color: msg.startsWith('✔') ? 'var(--pine)' : 'var(--mute)' }}>{msg}</p>}
      {rows.length === 0 && <p className="empty">아직 쓴 글이 없어요. '쓰는 중'에서 먼저 써 볼까요?</p>}
      <ul className="clist">
        {rows.map(i => (
          <li key={i.id} className={selecting && !ok(i) ? 'off' : ''}>
            {selecting ? (
              <label>
                <input type="checkbox" checked={picked.includes(i.id)} disabled={!ok(i) || busy} onChange={() => toggle(i.id)} aria-label={`${i.title || '(제목 없음)'} 선택`} />
                <span className="tt">
                  <b>{i.title || '(제목 없음)'}</b>
                  <small>
                    {i.genre || '글'} · {i.len}자 · {fmtDate(i.updated_at)}
                    {i.status === 'draft' && ' · 쓰다 만 글'}
                    {!ok(i) && ` · ${MIN_SEND}글자보다 짧아서 보낼 수 없어요`}
                  </small>
                </span>
              </label>
            ) : (
              <>
                <span className="tt">
                  <b>{i.title || '(제목 없음)'}</b>
                  <small>{i.genre || '글'} · {i.len}자 · {fmtDate(i.updated_at)}{i.status === 'draft' && ' · 쓰다 만 글'}</small>
                </span>
                <button className="btn sub" type="button" disabled={busy} onClick={() => onEdit(i.id)}>{i.status === 'draft' ? '이어 쓰기' : '고치기'}</button>
                <DeskSubmit session={session} id={i.id} disabled={busy} />
                <button className="btn sub del" type="button" disabled={busy} onClick={() => void remove(i)}>🗑 지우기</button>
              </>
            )}
          </li>
        ))}
      </ul>
      {selecting && (
        <div className="cbar">
          <button className="btn sub" type="button" disabled={busy} onClick={stop}>그만두기</button>
          <button className="btn" type="button" disabled={!picked.length || busy} onClick={() => void send()}>
            {busy ? '보내는 중…' : picked.length ? `${picked.length}편 AI 작가에게 보내기` : '글을 먼저 골라요'}
          </button>
        </div>
      )}
    </div>
  )
}
