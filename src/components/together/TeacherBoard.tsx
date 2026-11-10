import { Fragment, useEffect, useState } from 'react'
import {
  teacherOverview, teacherCreateRoom, teacherRoom, teacherHide, teacherClose, teacherPages, teacherMembers, teacherRelease, teacherSetBook, teacherSetSent, teacherGetSent, amTeacher, teacherSetLeader, teacherBgm, teacherBgmSynced,
  type TeacherMember, TeacherRoomSummary, type TeacherLine, type RelayMode,
} from '../../lib/relay'
import { uploadMedia } from '../../services/storageService'
import { sendRoomToBook, type SendResult } from '../../lib/roomToBook'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useAsk } from './useAsk'

// 교사 코드는 이 화면의 메모리에만 두고 브라우저에 저장하지 않는다
export default function TeacherBoard({ onBack }: { onBack: () => void }) {
  const [tc, setTc] = useState('')
  const [authed, setAuthed] = useState(false)
  const [rooms, setRooms] = useState<TeacherRoomSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const [name, setName] = useState('')
  const [mode, setMode] = useState<RelayMode>('free')
  const [limit, setLimit] = useState(30)
  const [max, setMax] = useState(5)
  const [free, setFree] = useState(true)

  const { user } = useAuthStore()
  const { ask, choose, box } = useAsk()
  const [bookId, setBookId] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [openCode, setOpenCode] = useState('')
  const [lines, setLines] = useState<TeacherLine[]>([])
  const [mems, setMems] = useState<TeacherMember[]>([])

  async function run<T>(f: () => Promise<T>): Promise<T | undefined> {
    setBusy(true); setErr('')
    try { return await f() }
    catch (e) { setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요'); return undefined }
    finally { setBusy(false) }
  }

  async function refresh() {
    const r = await run(() => teacherOverview(tc))
    if (r) { setRooms(r); setAuthed(true); setInfo(`방 ${r.length}개를 새로 확인했어요.`) }
  }

  // 선생님으로 등록된 계정이면 코드 없이 바로 열기
  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      try {
        if (!(await amTeacher())) return
        const r = await teacherOverview('')
        if (alive) { setRooms(r); setAuthed(true) }
      } catch { /* 코드 입력으로 */ }
    })()
    return () => { alive = false }
  }, [user])

  async function create() {
    if (!name.trim()) { setErr('방 이름을 써 주세요.'); return }
    const c = await run(() => teacherCreateRoom(tc, name.trim(), mode, limit, max, free))
    if (c) { setInfo(`방을 만들었어요! 방 번호는 ${c} 예요. 학생들에게 알려 주세요.`); setName(''); await refresh() }
  }

  async function toggle(code: string) {
    if (openCode === code) { setOpenCode(''); return }
    const r = await run(async () => ({ ls: await teacherRoom(tc, code), ms: await teacherMembers(tc, code), sent: await teacherGetSent(tc, code) }))
    if (r) { setLines(r.ls); setMems(r.ms); setOpenCode(code); setBookId(r.sent.book ?? ''); setSentCode(r.sent.book ? code : '') }
  }

  async function hide(l: TeacherLine) {
    const ok = await run(async () => { await teacherHide(tc, l.id, !l.hidden); return true })
    if (ok) setLines(old => old.map(x => (x.id === l.id ? { ...x, hidden: !l.hidden } : x)))
  }

  async function release(code: string, m: TeacherMember) {
    ask(`"${m.nickname}" 자리를 비워 줄까요?\n학생이 같은 별명으로 다시 들어오면 쓴 글과 꾸민 쪽이 그대로 이어져요.\n(지금 열려 있는 그 학생 화면은 더 쓸 수 없게 돼요.)`, async () => {
      const ok = await run(async () => { await teacherRelease(tc, code, m.seq); return true })
      if (ok) {
        setMems(old => old.map(x => (x.seq === m.seq ? { ...x, released: true } : x)))
        setInfo(`"${m.nickname}" 자리를 비웠어요. 같은 별명으로 다시 들어오라고 알려 주세요.`)
      }
    })
  }

  async function setLeader(code: string, m: TeacherMember) {
    const nextSeq = m.leader ? null : m.seq
    const ok = await run(async () => { await teacherSetLeader(tc, code, nextSeq); return true })
    if (ok) {
      setMems(old => old.map(x => ({ ...x, leader: nextSeq !== null && x.seq === nextSeq })))
      setInfo(nextSeq === null ? '방 대표를 없앴어요.' : `"${m.nickname}" 친구를 방 대표로 정했어요. 책 음악을 고를 수 있어요 👑`)
    }
  }

  // 방 대표가 고른 음악을 책에 붙인다 (새 책이거나, 음악이 바뀌었을 때만)
  async function syncBgm(code: string, bId: string, force: boolean) {
    try {
      const b = await teacherBgm(tc, code)
      if (!b.data || (b.synced && !force)) return false
      const blob = await (await fetch(b.data)).blob()
      const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') || blob.type.includes('m4a') ? 'm4a' : 'mp3'
      const file = new File([blob], `${(b.name || 'bgm').replace(/[^\w가-힣-]/g, '_')}.${ext}`, { type: blob.type })
      const url = await uploadMedia(file, 'uploads', `${user!.id}/${bId}/bgm`)
      const { error } = await supabase.from('books').update({ bgm_url: url }).eq('id', bId)
      if (error) return false
      await teacherBgmSynced(tc, code)
      return true
    } catch { return false }
  }

  async function doSend(r: TeacherRoomSummary, append?: { bookId: string; afterLine: number }) {
    if (!user) return
    if (append) { setBookId(append.bookId); setSentCode(r.code) }
    const res = await run(async () => {
      const ls = await teacherRoom(tc, r.code)
      const ps = await teacherPages(tc, r.code)
      const out: SendResult = await sendRoomToBook(user.id, r.name, ls, ps, append)
      await teacherSetSent(tc, r.code, out.bookId, out.lastLine)
      const bgmDone = await syncBgm(r.code, out.bookId, !append)
      return { ...out, bgmDone }
    })
    if (res) {
      setBookId(res.bookId); setSentCode(r.code)
      const bg = res.bgmDone ? ' 🎵 책 음악도 붙였어요.' : ''
      if (append && res.added === 0 && res.filled === 0 && !res.bgmDone) { setInfo('새로 붙일 이야기도, 바뀐 그림도 없어요. 이미 만든 책을 열거나 학생들에게 보여 줄 수 있어요 👉 오른쪽 [책 만들기]'); return }
      setInfo((append ? `기존 책에 새 쪽 ${res.added}개를 붙이고, 바뀐 그림 ${res.filled}장을 고쳤어요! [만든 책 열기]로 확인해 보세요.` : '플립북을 만들었어요! [만든 책 열기]로 이어서 꾸밀 수 있어요.') + bg)
    }
  }

  async function sendBook(r: TeacherRoomSummary) {
    if (!user) { setErr('플립북으로 보내려면 먼저 위쪽 [로그인]으로 선생님 계정에 로그인해 주세요.'); return }
    // 이 방으로 만든 책이 이미 있는지 확인
    const sent = await run(async () => {
      const s = await teacherGetSent(tc, r.code)
      if (!s.book) return null
      const { data } = await supabase.from('books').select('id,title').eq('id', s.book).maybeSingle()
      if (!data) return null
      const { count } = await supabase.from('pages').select('id', { count: 'exact', head: true }).eq('book_id', s.book)
      return { id: s.book, title: (data.title as string) || '제목 없음', pages: count ?? 0, line: s.line ?? 0 }
    })
    if (sent) {
      choose(`이 방으로 만든 책이 이미 있어요: "${sent.title}" (${sent.pages}쪽)\n어떻게 할까요?\n(숨긴 글은 빠져요.)`, [
        { label: '그 책에 이어 붙이기', fn: () => doSend(r, { bookId: sent.id, afterLine: sent.line }) },
        { label: '새 책으로 만들기', fn: () => doSend(r), ghost: true },
      ])
      return
    }
    ask(`"${r.name}" 이야기를 새 플립북으로 만들까요?\n(숨긴 글은 빠져요. 글 순서대로 쪽이 만들어져요.)`, () => doSend(r))
  }

  async function showToStudents(r: TeacherRoomSummary) {
    ask(`학생들에게 "${r.name}" 책을 보여 줄까요?\n학생 화면에 [완성된 책 보기] 버튼이 생겨요.\n⚠️ 책이 '공개'로 바뀌어 갤러리에서도 누구나 볼 수 있어요. 사진에 얼굴·이름이 없는지 먼저 확인해 주세요.`, async () => {
      const ok = await run(async () => {
        const { error } = await supabase.from('books').update({ is_public: true }).eq('id', bookId)
        if (error) throw new Error('책을 공개로 바꾸지 못했어요')
        await teacherSetBook(tc, r.code, bookId)
        return true
      })
      if (ok) setInfo('학생 화면에 [완성된 책 보기] 버튼이 생겼어요. 학생이 [새 글 확인]을 누르면 보여요.')
    })
  }

  async function close(code: string) {
    ask('이 방을 마무리할까요? 마무리하면 더 이상 글을 쓸 수 없어요.', async () => {
      const ok = await run(async () => { await teacherClose(tc, code); return true })
      if (ok) await refresh()
    })
  }

  if (!authed) {
    return (
      <div className="wrap">
        <h1>👩‍🏫 선생님 화면</h1>
        <form className="card" onSubmit={e => { e.preventDefault(); void refresh() }}>
          <label className="fld" htmlFor="tg-tc">교사 코드</label>
          <input id="tg-tc" type="password" autoComplete="off" value={tc} onChange={e => setTc(e.target.value)} />
          <p className="sub" style={{ marginTop: 6 }}>이 코드는 화면에만 잠깐 두고 저장하지 않아요. 학생에게 알려 주지 마세요.</p>
          <p className="sub" style={{ marginTop: 4 }}>{user ? <>코드를 매번 넣기 번거로우면 <a href="/profile">내 정보</a>에서 이 계정을 선생님으로 등록해 두세요.</> : '로그인한 뒤 내 정보에서 선생님으로 등록하면 코드 없이 들어와요.'}</p>
          {err && <div className="err" role="alert">{err}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" type="submit" disabled={busy || !tc}>{busy ? '확인 중…' : '들어가기'}</button>
            <button className="btn ghost" type="button" onClick={onBack}>돌아가기</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="wrap wide">
      <h1>👩‍🏫 선생님 화면</h1>
      <p className="sub">방을 만들고, 모든 방의 이야기를 한눈에 봐요. 부적절한 문장은 숨길 수 있어요.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <b>새 방 만들기</b>
        <div className="row" style={{ marginTop: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 160px' }}>
            <label className="fld" htmlFor="tg-rn" style={{ marginTop: 0 }}>방 이름</label>
            <input id="tg-rn" type="text" maxLength={30} placeholder="예: 별빛 방" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="fld" htmlFor="tg-md" style={{ marginTop: 0 }}>방식</label>
            <select id="tg-md" value={mode} onChange={e => setMode(e.target.value as RelayMode)}>
              <option value="free">여유 (시간 제한 없음)</option>
              <option value="challenge">도전 (시간 제한)</option>
            </select>
          </div>
          {mode === 'challenge' && (
            <div style={{ flex: '1 1 110px' }}>
              <label className="fld" htmlFor="tg-lm" style={{ marginTop: 0 }}>한 차례(초)</label>
              <input id="tg-lm" type="number" min={10} max={600} value={limit}
                onChange={e => setLimit(Math.min(600, Math.max(10, Number(e.target.value) || 30)))} />
            </div>
          )}
          <div style={{ flex: '1 1 110px' }}>
            <label className="fld" htmlFor="tg-mx" style={{ marginTop: 0 }}>최대 인원</label>
            <select id="tg-mx" value={max} onChange={e => setMax(Number(e.target.value))}>
              {[4, 5, 6].map(n => <option key={n} value={n}>{n}명</option>)}
            </select>
          </div>
          <label style={{ flex: '1 1 100%', display: 'flex', gap: 8, alignItems: 'center', fontSize: 15 }}>
            <input type="checkbox" checked={free} onChange={e => setFree(e.target.checked)} style={{ width: 22, height: 22 }} />
            같은 별명이면 바로 다시 들어오기 <span style={{ color: 'var(--mute)' }}>(끄면 선생님이 [자리 비워 주기]를 눌러야 해요)</span>
          </label>
          <button className="btn" type="button" onClick={() => void create()} disabled={busy}>방 만들기</button>
        </div>
      </div>

      {box}
      {err && <div className="err" role="alert">{err}</div>}
      {info && !err && <div className="cmsg good" style={{ marginBottom: 8 }}>{info}</div>}

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="cbtn" type="button" onClick={() => void refresh()} disabled={busy}>{busy ? '가져오는 중…' : '🔄 모든 방 새로 확인'}</button>
        <button className="btn ghost sm" type="button" onClick={onBack}>나가기</button>
      </div>

      {rooms.length === 0 ? (
        <div className="empty">아직 만든 방이 없어요. 위에서 새 방을 만들어 보세요.</div>
      ) : (
        <table>
          <thead><tr><th>방 번호</th><th>이름</th><th>지금 차례</th><th>줄 수</th><th>인원</th><th>상태</th></tr></thead>
          <tbody>
            {rooms.map(r => (
              <Fragment key={r.code}>
                <tr className="rm" onClick={() => void toggle(r.code)}>
                  <td className="codechip">{r.code}</td>
                  <td>{r.name}</td>
                  <td>{r.status === 'done' ? '—' : r.turn ?? '—'}</td>
                  <td>{r.lines}</td>
                  <td>{r.members}</td>
                  <td><span className={`st ${r.status === 'done' ? 'done' : 'ok'}`}>{r.status === 'done' ? '마무리' : '진행 중'}</span></td>
                </tr>
                {openCode === r.code && (
                  <tr className="det">
                    <td colSpan={6}>
                      <div className="detgrid">
                        <div className="card" style={{ margin: 0 }}>
                          <b>📖 이야기 목록</b>
                          {lines.filter(l => !l.sys).length === 0 && <div className="empty">아직 쓴 글이 없어요.</div>}
                          {lines.filter(l => !l.sys).map(l => (
                            <div key={l.id} className={`ln${l.hidden ? ' hid' : ''}`}>
                              <span><b>{l.who}</b>: {l.t}</span>
                              <button type="button" onClick={() => void hide(l)}>{l.hidden ? '다시 보이기' : '숨기기'}</button>
                            </div>
                          ))}
                        </div>
                        <aside className="side">
                          {mems.length > 0 && (
                            <div className="card" style={{ margin: 0 }}>
                              <b>👥 학생 자리</b>
                              <div style={{ marginTop: 6 }}>
                                {mems.map(m => (
                                  <div key={m.seq} className="mem">
                                    <span>{m.leader ? '👑 ' : ''}{m.nickname}</span>
                                    <button className="btn ghost sm" type="button" disabled={busy} onClick={() => void setLeader(r.code, m)}>{m.leader ? '대표 해제' : '대표로 정하기'}</button>
                                    {m.released
                                      ? <em style={{ fontSize: 14 }}>(다시 들어오기 기다림)</em>
                                      : <button className="btn ghost sm" type="button" disabled={busy} onClick={() => void release(r.code, m)}>자리 비워 주기</button>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="card" style={{ margin: 0 }}>
                            <b>📚 책 만들기</b>
                            <div className="col">
                              <button className="btn sm" type="button" disabled={busy} onClick={() => void sendBook(r)}>📖 플립북으로 보내기</button>
                              {bookId && sentCode === r.code && (
                                <a className="btn ghost sm" href={`/edit/${bookId}?from=together`} target="_blank" onClick={e => { e.preventDefault(); window.open(`/edit/${bookId}?from=together`, '_blank') }}>만든 책 열기</a>
                              )}
                              {bookId && sentCode === r.code && (
                                <button className="btn ghost sm" type="button" disabled={busy} onClick={() => void showToStudents(r)}>👦 학생들에게 책 보여 주기</button>
                              )}
                            </div>
                          </div>
                          {r.status !== 'done' && (
                            <div className="card" style={{ margin: 0 }}>
                              <b>🚪 방 닫기</b>
                              <div className="col"><button className="btn red sm" type="button" onClick={() => void close(r.code)}>이 방 마무리하기</button></div>
                            </div>
                          )}
                        </aside>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
