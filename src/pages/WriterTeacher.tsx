import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/writer.css'
import { useAuthStore } from '../store/authStore'
import {
    amTeacher, teacherClasses, teacherCloseClass, teacherCreateClass, teacherDeleteClass,
    teacherRemoveStudent, teacherStudents, type ClassStudent, type ClassSummary,
} from '../lib/writerClass'

// 교사 코드는 이 화면의 메모리에만 두고 브라우저에 저장하지 않는다
function ago(iso: string): { text: string; slow: boolean } {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (min < 1) return { text: '방금', slow: false }
    if (min < 60) return { text: `${min}분 전`, slow: false }
    const h = Math.round(min / 60)
    if (h < 24) return { text: `${h}시간 전`, slow: false }
    const d = Math.round(h / 24)
    return { text: `${d}일째 활동 없음`, slow: d >= 3 }
}

export default function WriterTeacher() {
    const { user } = useAuthStore()
    const [tc, setTc] = useState('')
    const [authed, setAuthed] = useState(false)
    const [classes, setClasses] = useState<ClassSummary[]>([])
    const [open, setOpen] = useState<ClassSummary | null>(null)
    const [students, setStudents] = useState<ClassStudent[]>([])
    const [name, setName] = useState('')
    const [max, setMax] = useState(30)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [info, setInfo] = useState('')
    const [checking, setChecking] = useState(false)

    async function run<T>(f: () => Promise<T>): Promise<T | undefined> {
        setBusy(true); setErr('')
        try { return await f() }
        catch (e) { setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요'); return undefined }
        finally { setBusy(false) }
    }

    async function loadClasses() {
        const r = await run(() => teacherClasses(tc))
        if (r) { setClasses(r); setAuthed(true); setInfo(`교실 ${r.length}개를 확인했어요.`) }
    }

    // 선생님으로 등록된 계정이면 코드 없이 바로 열기
    useEffect(() => {
        if (!user) return
        let alive = true
        setChecking(true)
        ;(async () => {
            try {
                if (!(await amTeacher())) { if (alive) setInfo('이 계정은 선생님으로 등록돼 있지 않아요. 코드를 넣어 주세요.'); return }
                const r = await teacherClasses('')
                if (alive) { setClasses(r); setAuthed(true) }
            } catch (e) {
                if (alive) setInfo('자동으로 열지 못했어요(' + (e instanceof Error ? e.message : '알 수 없는 문제') + '). 코드를 넣어 주세요.')
            } finally { if (alive) setChecking(false) }
        })()
        return () => { alive = false }
    }, [user])

    async function create() {
        if (!name.trim()) { setErr('교실 이름을 써 주세요.'); return }
        const c = await run(() => teacherCreateClass(tc, name.trim(), max))
        if (c) { setName(''); setInfo(`교실 번호는 ${c} 예요. 학생에게 알려 주세요.`); const r = await run(() => teacherClasses(tc)); if (r) setClasses(r) }
    }

    async function show(c: ClassSummary) {
        const r = await run(() => teacherStudents(tc, c.code))
        if (r) { setOpen(c); setStudents(r); setInfo('') }
    }

    async function remove(s: ClassStudent) {
        if (!open || !window.confirm(`${s.nickname} 학생을 내보낼까요?\n이 교실 목록에서 기록이 지워져요.`)) return
        const ok = await run(async () => { await teacherRemoveStudent(tc, open.code, s.id); return true })
        if (ok) setStudents((l) => l.filter((x) => x.id !== s.id))
    }

    async function close(c: ClassSummary) {
        if (!window.confirm(`${c.name} 교실을 닫을까요?\n닫으면 학생이 더 보낼 수 없어요. 지금까지 기록은 볼 수 있어요.`)) return
        const ok = await run(async () => { await teacherCloseClass(tc, c.code); return true })
        if (ok) { setOpen(null); await loadClasses() }
    }

    async function del(c: ClassSummary) {
        if (!window.confirm(`${c.name} 교실을 지울까요?\n학생 기록도 모두 지워지고 되돌릴 수 없어요.`)) return
        const ok = await run(async () => { await teacherDeleteClass(tc, c.code); return true })
        if (ok) { setOpen(null); await loadClasses() }
    }

    const total = (s: ClassStudent) => s.adopt + s.fix + s.discard

    return (
        <div className="wr">
            <div className="wrap" style={{ maxWidth: 980, margin: '0 auto', padding: '88px 16px 64px' }}>
                <p className="kicker">AI 작가 교실</p>
                <h1 style={{ margin: '4px 0 6px' }}>교사 보기</h1>
                <p className="note" style={{ marginTop: 0 }}>학생이 켠 "선생님께 보여주기"의 숫자만 보여요. 학생이 쓴 글은 볼 수 없어요. <Link to="/writer">← AI 작가로</Link></p>

                {checking && !authed && <p className="note" role="status">선생님 계정인지 확인하는 중…</p>}
                {!authed && !checking && (
                    <div className="lib">
                        <label className="dl" htmlFor="aw-tc"><dt>교사 코드</dt>
                            <input id="aw-tc" className="wr-input" type="password" autoComplete="off" value={tc} onChange={(e) => setTc(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && tc) loadClasses() }} placeholder="이야기 교실과 같은 코드" />
                        </label>
                        <button className="linkbtn" disabled={busy || !tc} onClick={loadClasses}>들어가기</button>
                    </div>
                )}

                {err && <p className="note" role="alert" style={{ color: 'var(--tomato)' }}>{err}</p>}
                {info && <p className="note" role="status">{info}</p>}

                {authed && !open && (
                    <>
                        <div className="lib" style={{ marginTop: 20 }}>
                            <h3>새 교실 만들기</h3>
                            <label className="dl"><dt>교실 이름</dt>
                                <input className="wr-input" maxLength={20} value={name} placeholder="예: 5학년 2반" onChange={(e) => setName(e.target.value)} />
                            </label>
                            <label className="dl"><dt>최대 학생 수 (1~60)</dt>
                                <input className="wr-input" type="number" min={1} max={60} value={max} onChange={(e) => setMax(Number(e.target.value) || 30)} />
                            </label>
                            <button className="linkbtn" disabled={busy} onClick={create}>교실 만들기</button>
                        </div>

                        <div className="lib" style={{ marginTop: 20 }}>
                            <h3>내 교실 ({classes.length})</h3>
                            {classes.length === 0 && <p className="note">아직 교실이 없어요.</p>}
                            <ul className="tclist">
                                {classes.map((c) => (
                                    <li key={c.code}>
                                        <span><b>{c.name}</b> · 번호 <b>{c.code}</b> · {c.students}/{c.max}명 · {c.status === 'open' ? '열림' : '닫힘'}</span>
                                        <button className="linkbtn" disabled={busy} onClick={() => show(c)}>학생 보기</button>
                                    </li>
                                ))}
                            </ul>
                            <button className="linkbtn" disabled={busy} onClick={loadClasses}>새로고침</button>
                        </div>
                    </>
                )}

                {authed && open && (
                    <div className="lib" style={{ marginTop: 20 }}>
                        <h3>{open.name} · 번호 {open.code} · {open.status === 'open' ? '열림' : '닫힘'}</h3>
                        <div className="resetrow">
                            <button className="linkbtn" disabled={busy} onClick={() => show(open)}>새로고침</button>
                            <button className="linkbtn" disabled={busy} onClick={() => setOpen(null)}>← 교실 목록</button>
                            {open.status === 'open' && <button className="linkbtn" disabled={busy} onClick={() => close(open)}>교실 닫기</button>}
                            <button className="linkbtn" disabled={busy} onClick={() => del(open)}>교실 지우기</button>
                        </div>
                        {students.length === 0 ? <p className="note">아직 들어온 학생이 없어요. 학생에게 교실 번호 <b>{open.code}</b>를 알려 주세요.</p> : (
                            <div className="tcwrap">
                                <table className="tctable">
                                    <thead><tr>
                                        <th>별명</th><th>작가</th><th>레벨</th><th>채택</th><th>고침</th><th>버림</th>
                                        <th title="도장 중 고침 비율">고침 비율</th><th>끝낸 퀘스트</th><th>책장 글</th><th>마지막 활동</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {students.map((s) => {
                                            const a = ago(s.updated_at)
                                            const t = total(s)
                                            return (
                                                <tr key={s.id}>
                                                    <td><b>{s.nickname}</b></td>
                                                    <td>{s.writer || '-'}</td>
                                                    <td>Lv.{s.level}</td>
                                                    <td>{s.adopt}</td><td>{s.fix}</td><td>{s.discard}</td>
                                                    <td>{t ? `${Math.round((s.fix / t) * 100)}%` : '-'}</td>
                                                    <td>{s.quests}</td><td>{s.library}</td>
                                                    <td style={a.slow ? { color: 'var(--tomato)', fontWeight: 700 } : undefined}>{a.text}</td>
                                                    <td><button className="linkbtn" disabled={busy} onClick={() => remove(s)}>내보내기</button></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="note">채택은 AI 글을 그대로 쓴 도장, 고침은 직접 고쳐 쓴 도장, 버림은 쓰지 않기로 한 도장이에요. 고침 비율이 높을수록 직접 손봤다는 뜻이에요.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
