import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/writer.css'
import { useWriterStore } from '../store/writerStore'
import { useAuthStore } from '../store/authStore'
import Character, { CHAR_VIEWBOX } from '../components/writer/Character'
import LookEditor from '../components/writer/LookEditor'
import { DEFAULT_LOOK, SAMPLES, normalizeLook } from '../data/charParts'
import { EVENT_MOOD, getTemper, moodLine } from '../lib/writerLook'
import { GENRES, getGenre } from '../data/genres'
import { SAFETY_GUIDE } from '../data/safetyGuide'
import { checkPrivacy, maskHits } from '../lib/privacyCheck'
import { buildPrompt, libraryReadiness, LIB_TIERS, MIN_PIECE_CHARS, MAX_RAW, MAX_SAMPLES, MAX_SEED, MAX_TOPIC, MIN_REASON, STAMP_LABEL, STAMP_XP, xpForNext } from '../lib/writerPrompt'
import { deskGet, deskList, loadDeskSession, type DeskPieceItem } from '../lib/desk'
import { loadHistory, relayCheck, type SavedSession } from '../lib/relay'
import { sendToBook } from '../lib/writerBook'
import { buildExportText, downloadText, exportSources, privacyProblems } from '../lib/writerLibrary'
import { joinClass, leaveClass, loadMembership, sendReport, useClassSync, type ClassMembership } from '../lib/writerClass'
import type { GenreId, Look, Mood, StampKind } from '../types/writer'

type View = 'quest' | 'dex' | 'desk' | 'writer'
const LV_NAMES = ['견습 작가', '신인 작가', '인기 작가', '베스트셀러 작가']
const SPLIT_KEY = 'ai-writer-split'
const SPLIT_MIN = 0.3
const SPLIT_MAX = 0.7
const SPLIT_DEFAULT = 0.6
const SPLIT_GAP = 40
const STAMP_CLASS: Record<StampKind, string> = { adopt: '', fix: 't-mod', discard: 't-bad' }

export default function Writer() {
    const writer = useWriterStore((s) => s.writer)
    if (!writer) return <CreateWriter />
    return <Room />
}

/* ───────── 작가 만들기 ───────── */
type Step = 'kind' | 'gender' | 'sample' | 'detail'

function CreateWriter() {
    const createWriter = useWriterStore((s) => s.createWriter)
    const [step, setStep] = useState<Step>('kind')
    const [kind, setKind] = useState<'person' | 'tool'>('person')
    const [gender, setGender] = useState<'girl' | 'boy'>('girl')
    const [name, setName] = useState('')
    const [persona, setPersona] = useState({ personality: '', tone: '', likes: '', avoids: '' })
    const [look, setLook] = useState<Look>(DEFAULT_LOOK)
    const [pmood, setPmood] = useState<Mood>('happy')
    const fields: [keyof typeof persona, string, string][] = [
        ['personality', '성격', '예: 조용하고 관찰을 잘해요'],
        ['tone', '말투', '예: 짧고 부드럽게 말해요'],
        ['likes', '좋아하는 것', '예: 비 오는 날, 고양이'],
        ['avoids', '쓰지 않는 것', '예: 어려운 한자어'],
    ]
    const list = kind === 'tool' ? SAMPLES.tool : SAMPLES[gender]
    const pickSample = (l: Look) => { setLook(l); setPmood('idle'); setStep('detail') }
    const back = () => setStep(step === 'detail' ? 'sample' : step === 'sample' ? (kind === 'person' ? 'gender' : 'kind') : 'kind')
    const stepNo = { kind: 1, gender: 2, sample: 3, detail: 4 }[step]

    return (
        <div className="wr" style={{ minHeight: '100vh' }}>
            <div className="wrap">
                <header className="top"><h1>나만의 AI 작가 만들기</h1></header>
                <div className="grid">
                    <section className="sticky">
                        <div className="room" style={{ background: 'var(--wall)', padding: 24 }}>
                            <svg viewBox={CHAR_VIEWBOX} style={{ width: '100%', maxHeight: 420 }} role="img" aria-label="내 AI 작가"><Character look={look} mood={pmood} temper={getTemper(persona)} /></svg>
                        </div>
                    </section>
                    <aside className="panel">
                        <p className="kicker">{stepNo} / 4 단계</p>
                        {step !== 'kind' && <button type="button" className="backbtn" onClick={back}>← 뒤로</button>}

                        {step === 'kind' && (<>
                            <h2>어떤 친구와 글을 쓸까요?</h2>
                            <div className="pick-kind">
                                <button type="button" onClick={() => { setKind('person'); setStep('gender') }}>사람 친구<small>동글동글 작가</small></button>
                                <button type="button" onClick={() => { setKind('tool'); setLook(SAMPLES.tool[0].look); setStep('sample') }}>도구 친구<small>연필·책·잉크병</small></button>
                            </div>
                        </>)}

                        {step === 'gender' && (<>
                            <h2>여자 친구? 남자 친구?</h2>
                            <div className="pick-kind">
                                <button type="button" onClick={() => { setGender('girl'); setLook(SAMPLES.girl[0].look); setStep('sample') }}>여자 친구</button>
                                <button type="button" onClick={() => { setGender('boy'); setLook(SAMPLES.boy[0].look); setStep('sample') }}>남자 친구</button>
                            </div>
                        </>)}

                        {step === 'sample' && (<>
                            <h2>마음에 드는 친구를 골라요</h2>
                            <div className="pick-samples">
                                {list.map((sm) => (
                                    <button key={sm.id} type="button" className="pick-sample" onClick={() => pickSample(sm.look)}>
                                        <svg viewBox={CHAR_VIEWBOX} aria-hidden="true"><Character look={sm.look} mood="idle" /></svg>
                                        {sm.name}<small>{sm.hint}</small>
                                    </button>
                                ))}
                            </div>
                        </>)}

                        {step === 'detail' && (<>
                            <h2>이름과 성격 정하기</h2>
                            <p className="lead">진짜 이름 말고 별명을 지어 주세요. 이 설정서가 AI에게 보내는 글 맨 앞에 붙어요.</p>
                            <label className="dl"><dt>작가 이름 (별명)</dt>
                                <input className="wr-input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="예: 달이" />
                            </label>
                            {fields.map(([k, label, ph]) => (
                                <label key={k} className="dl"><dt>{label}</dt>
                                    <input className="wr-input" value={persona[k]} maxLength={40} placeholder={ph} onChange={(e) => setPersona({ ...persona, [k]: e.target.value })} />
                                </label>
                            ))}
                            <div className="dl"><dt>모습 꾸미기</dt>
                                <LookEditor look={look} level={1} onChange={setLook} mood={pmood} onMood={setPmood} />
                            </div>
                            <button className="linkbtn" style={{ marginTop: 24 }} disabled={name.trim().length < 1} onClick={() => createWriter(name.trim(), persona, look)}>이 친구로 시작!</button>
                            <p className="note">안경·망토 같은 꾸미기는 레벨이 오르면 하나씩 열려요.</p>
                        </>)}
                    </aside>
                </div>
            </div>
        </div>
    )
}

/* ───────── 방 ───────── */
function Room() {
    const { writer, quests, activeQuestId } = useWriterStore()
    useClassSync()
    const [view, setView] = useState<View>('quest')
    const [toast, setToast] = useState('')
    const w = writer!
    const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2200) }
    const active = quests.find((q) => q.id === activeQuestId) ?? null
    const lastEvent = useWriterStore((s) => s.lastEvent)
    const mountT = useRef(Date.now())
    const roomRef = useRef<HTMLDivElement>(null)
    const [flash, setFlash] = useState<Mood | null>(null)
    const [preview, setPreview] = useState<Mood | null>(null)
    const [seen, setSeen] = useState(true)
    const temper = useMemo(() => getTemper(w.persona), [w.persona])
    useEffect(() => {
        if (!lastEvent || lastEvent.t < mountT.current) return
        setFlash(EVENT_MOOD[lastEvent.kind])
        const id = window.setTimeout(() => setFlash(null), 3200)
        return () => window.clearTimeout(id)
    }, [lastEvent])
    // 화면 밖에 있으면 움직임을 멈춘다
    useEffect(() => {
        const el = roomRef.current
        if (!el || typeof IntersectionObserver === 'undefined') return
        const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting))
        io.observe(el)
        return () => io.disconnect()
    }, [])
    // 오른쪽 칸 전체화면 + 경계선 끌어서 너비 조절 (왼쪽 칸 비율 0.3~0.7, 브라우저에만 저장)
    const [full, setFull] = useState(false)
    const gridRef = useRef<HTMLDivElement>(null)
    const [ratio, setRatio] = useState(() => {
        try { const v = parseFloat(localStorage.getItem(SPLIT_KEY) ?? ''); if (v >= SPLIT_MIN && v <= SPLIT_MAX) return v } catch { /* 저장소를 못 쓰면 기본값 */ }
        return SPLIT_DEFAULT
    })
    const saveRatio = (r: number) => { setRatio(r); try { localStorage.setItem(SPLIT_KEY, String(r)) } catch { /* 무시 */ } }
    const clampR = (r: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, r))
    const liveR = useRef(ratio)
    const onSplitDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const grid = gridRef.current
        if (!grid) return
        e.preventDefault()
        const handle = e.currentTarget
        handle.setPointerCapture(e.pointerId)
        grid.classList.add('dragging')
        const move = (ev: PointerEvent) => {
            const rect = grid.getBoundingClientRect()
            const r = clampR((ev.clientX - rect.left - SPLIT_GAP / 2) / (rect.width - SPLIT_GAP))
            liveR.current = r
            grid.style.setProperty('--r', String(r))
        }
        const up = () => {
            handle.removeEventListener('pointermove', move)
            handle.removeEventListener('pointerup', up)
            handle.removeEventListener('pointercancel', up)
            grid.classList.remove('dragging')
            saveRatio(liveR.current)
        }
        handle.addEventListener('pointermove', move)
        handle.addEventListener('pointerup', up)
        handle.addEventListener('pointercancel', up)
    }
    const onSplitKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); saveRatio(clampR(ratio - 0.03)) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); saveRatio(clampR(ratio + 0.03)) }
        else if (e.key === 'Home') { e.preventDefault(); saveRatio(SPLIT_DEFAULT) }
    }
    useEffect(() => { liveR.current = ratio; gridRef.current?.style.setProperty('--r', String(ratio)) }, [ratio])
    // 전체화면: Esc로 닫기, 뒤쪽 화면 스크롤 잠그기
    useEffect(() => {
        if (!full) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false) }
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKey)
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [full])

    const shown: Mood | null = (view === 'writer' ? preview : null) ?? flash
    const baseMood: Mood = active?.status === 'stamping' ? 'think' : view === 'desk' ? 'happy' : (normalizeLook(w.look).rest ?? 'idle')
    const mood: Mood = shown ?? baseMood
    const need = xpForNext(w.level)
    const doneGenres = useMemo(() => new Set(quests.filter((q) => q.status === 'done').map((q) => q.genre)), [quests])
    const say: Record<View, string> = {
        quest: '오늘은 어떤 이야기를 써 볼까?',
        dex: '장르마다 맛이 달라. 하나씩 모아 보자!',
        desk: '완성한 글을 책으로 묶어 볼까?',
        writer: '이게 나의 설정서야. 마음에 들어?',
    }
    const objs: { id: View; label: string; aria: string }[] = [
        { id: 'dex', label: '장르 도감', aria: '장르 도감 열기' },
        { id: 'quest', label: '오늘의 퀘스트', aria: '오늘의 퀘스트 열기' },
        { id: 'desk', label: '내 책 만들기', aria: '내 책 만들기 열기' },
        { id: 'writer', label: '작가 설정서', aria: '작가 설정서 열기' },
    ]
    const key = (id: View) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView(id) } }
    const oc = (id: View) => ({ role: 'button' as const, tabIndex: 0, onClick: () => setView(id), onKeyDown: key(id) })

    return (
        <div className="wr" style={{ minHeight: '100vh' }}>
            <div className="wrap">
                <header className="top">
                    <h1>{w.name}의 방</h1>
                    <div className="sub"><Link to="/dashboard">← 내 책장으로</Link></div>
                </header>
                <div className="grid split" ref={gridRef} style={{ '--r': ratio } as React.CSSProperties}>
                    <section>
                        <div className={`room${seen ? '' : ' wr-still'}`} ref={roomRef}>
                            <svg id="room" viewBox="0 0 800 520" role="group" aria-label={`${w.name}의 방`}>
                                <defs><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.7" fill="#EBD6A6" /></pattern></defs>
                                <rect width="800" height="372" fill="var(--wall)" />
                                <rect width="800" height="372" fill="url(#dots)" />
                                <rect y="372" width="800" height="148" fill="var(--wood)" />
                                <g stroke="var(--wood-d)" strokeWidth="2" opacity=".45"><line x1="0" y1="414" x2="800" y2="414" /><line x1="0" y1="458" x2="800" y2="458" /><line x1="0" y1="500" x2="800" y2="500" /></g>
                                <rect y="366" width="800" height="10" fill="var(--wood-d)" />
                                <rect x="326" y="48" width="148" height="150" fill="var(--wood-d)" />
                                <rect x="334" y="56" width="63" height="134" fill="var(--sky)" /><rect x="403" y="56" width="63" height="134" fill="var(--sky)" />
                                <circle cx="372" cy="96" r="19" fill="#FFF3B0" /><circle cx="380" cy="90" r="17" fill="var(--sky)" />
                                <ellipse cx="400" cy="446" rx="190" ry="40" fill="#F2B6A3" />

                                <g className={`obj${view === 'dex' ? ' on' : ''}`} aria-label={objs[0].aria} {...oc('dex')}>
                                    <g className="lift">
                                    <rect x="34" y="106" width="200" height="268" fill="#B07A48" /><rect x="46" y="118" width="176" height="244" fill="#8E5F34" />
                                    {GENRES.map((g, i) => (
                                        <g key={g.id} opacity={doneGenres.has(g.id) ? 1 : 0.35}>
                                            <rect x={58 + i * 50} y={142} width="38" height="54" fill={['#F7C844', '#E8553E', '#66A844'][i]} />
                                        </g>
                                    ))}
                                    <g stroke="#B07A48" strokeWidth="8"><line x1="46" y1="196" x2="222" y2="196" /><line x1="46" y1="276" x2="222" y2="276" /><line x1="46" y1="356" x2="222" y2="356" /></g>
                                    <g className="tag"><rect x="64" y="384" width="140" height="30" /><text x="134" y="406">장르 도감</text></g>
                                    </g>
                                    <rect className="hit" x="30" y="100" width="208" height="318" rx="4" />
                                </g>

                                <g className={`obj${view === 'quest' ? ' on' : ''}`} aria-label={objs[1].aria} {...oc('quest')}>
                                    <g className="lift">
                                    <rect x="562" y="62" width="206" height="170" fill="#A9743F" /><rect x="572" y="72" width="186" height="150" fill="#E0B27A" />
                                    <g transform="rotate(-4 610 120)"><rect x="586" y="88" width="72" height="64" fill="#fff" /><g stroke="#BDA98A" strokeWidth="3"><line x1="594" y1="104" x2="650" y2="104" /><line x1="594" y1="116" x2="642" y2="116" /><line x1="594" y1="128" x2="650" y2="128" /></g></g>
                                    <g transform="rotate(5 700 130)"><rect x="672" y="84" width="74" height="70" fill="var(--mustard)" /><text x="709" y="124" fontSize="20" fontWeight="700" textAnchor="middle" fill="var(--ink)" fontFamily="Gowun Dodum">퀘스트</text></g>
                                    <g className="tag"><rect x="598" y="242" width="134" height="30" /><text x="665" y="264">오늘의 퀘스트</text></g>
                                    </g>
                                    <rect className="hit" x="558" y="58" width="214" height="218" />
                                </g>

                                <g className={`obj${view === 'desk' ? ' on' : ''}`} aria-label={objs[2].aria} {...oc('desk')}>
                                    <g className="lift">
                                    <rect x="548" y="338" width="228" height="20" fill="#B07A48" /><rect x="560" y="358" width="14" height="60" fill="#8E5F34" /><rect x="750" y="358" width="14" height="60" fill="#8E5F34" />
                                    <polygon points="590,336 662,322 662,338 590,342" fill="#fff" /><polygon points="662,322 734,336 734,342 662,338" fill="#FFF8E7" />
                                    <g className="tag"><rect x="594" y="424" width="132" height="30" /><text x="660" y="446">내 책 만들기</text></g>
                                    </g>
                                    <rect className="hit" x="544" y="292" width="236" height="166" />
                                </g>

                                <g transform="translate(320 214)">
                                    <g className={`obj${view === 'writer' ? ' on' : ''}`} aria-label={objs[3].aria} {...oc('writer')}>
                                        <g className="lift">
                                        <g transform="translate(-20 0)"><Character look={w.look} mood={mood} temper={temper} /></g>
                                        <g className="tag"><rect x="10" y="238" width="140" height="30" /><text x="80" y="260">작가 설정서</text></g>
                                        </g>
                                        <rect className="hit" x="10" y="0" width="140" height="272" />
                                    </g>
                                </g>
                            </svg>
                            <div className="bubble" role="status"><b>{w.name}</b><span>{(shown && moodLine(shown, temper)) || say[view]}</span></div>
                        </div>

                        <div className="stats" aria-label="작가 상태">
                            <div className="lv">
                                <div className="name">{LV_NAMES[Math.min(w.level - 1, LV_NAMES.length - 1)]}</div>
                                <div className="big">Lv.{w.level}</div>
                                <div className="xpbar"><i style={{ width: `${Math.min(100, (w.xp / need) * 100)}%` }} /></div>
                                <div className="xpnum">{w.xp} / {need} XP</div>
                            </div>
                            {([['imagination', '상상력'], ['expression', '표현력'], ['judgment', '판단력'], ['persistence', '끈기']] as const).map(([k, l]) => (
                                <div className="st" key={k}><span className="n">{w.stats[k]}</span><div className="l">{l}</div></div>
                            ))}
                        </div>
                    </section>

                    <div
                        className="splitter" role="separator" aria-orientation="vertical" tabIndex={0}
                        aria-label="왼쪽 칸과 오른쪽 칸 너비 조절 (좌우 화살표 키, 더블클릭하면 처음 크기)"
                        aria-valuemin={Math.round(SPLIT_MIN * 100)} aria-valuemax={Math.round(SPLIT_MAX * 100)} aria-valuenow={Math.round(ratio * 100)}
                        onPointerDown={onSplitDown} onKeyDown={onSplitKey} onDoubleClick={() => saveRatio(SPLIT_DEFAULT)}
                    ><i /></div>

                    <aside className={`panel${full ? ' full' : ''}`} aria-live="polite">
                        <button type="button" className="fullbtn" onClick={() => setFull(!full)} aria-pressed={full} aria-label={full ? '전체화면 닫기' : '크게 보기 (전체화면)'}>
                            {full ? '✕ 닫기 (Esc)' : '⛶ 크게 보기'}
                        </button>
                        {view === 'quest' && <QuestPanel toast={showToast} goDesk={() => setView('desk')} />}
                        {view === 'dex' && <DexPanel doneGenres={doneGenres} level={w.level} />}
                        {view === 'desk' && <DeskPanel toast={showToast} />}
                        {view === 'writer' && <SheetPanel toast={showToast} mood={preview ?? 'idle'} onMood={setPreview} />}
                    </aside>
                </div>
            </div>
            <div className={`toast${toast ? ' show' : ''}`} role="status">{toast}</div>
        </div>
    )
}

// 글 한 편에서 "주제 한 줄"만 뽑는다: 제목이 있으면 제목, 없으면 첫 문장
function shortTopic(title: string, body: string): string {
    const t = title.trim()
    if (t.length >= 5 && t !== '제목 없음') return t.slice(0, MAX_TOPIC)
    const first = body.trim().split(/(?<=[.!?。])\s|\n/)[0] ?? ''
    return first.slice(0, MAX_TOPIC)
}

/* ───────── 내 글에서 씨앗 가져오기 (작가의 책상·이야기 교실) ───────── */
function SeedImport({ onPick }: { onPick: (full: string, topic: string) => void }) {
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState('')
    const [pieces, setPieces] = useState<DeskPieceItem[] | null>(null)
    const deskKey = loadDeskSession()?.key
    const rooms: SavedSession[] = open ? loadHistory() : []

    async function toggle() {
        const next = !open
        setOpen(next); setMsg('')
        if (next && deskKey && pieces === null) {
            setBusy(true)
            try { setPieces(await deskList(deskKey)) } catch { setPieces([]); setMsg('책상 글을 못 불러왔어요. 잠시 후 다시 해 보세요.') } finally { setBusy(false) }
        }
    }
    async function fromDesk(it: DeskPieceItem) {
        if (!deskKey) return
        setBusy(true); setMsg('')
        try { const d = await deskGet(deskKey, it.id); onPick(`${d.title}\n${d.body}`.trim(), shortTopic(d.title, d.body)); setOpen(false) } catch { setMsg('글을 못 가져왔어요.') } finally { setBusy(false) }
    }
    async function fromRoom(r: SavedSession) {
        setBusy(true); setMsg('')
        try {
            const st = await relayCheck(r.code, r.token, 0, 0)
            const text = (st.lines ?? []).filter((l) => !l.sys).map((l) => l.t).join(' ')
            if (!text) setMsg('이 방에는 아직 쓴 글이 없어요.')
            else { onPick(text, shortTopic('', text)); setOpen(false) }
        } catch { setMsg('방 이야기를 못 가져왔어요. 방이 닫혔을 수 있어요.') } finally { setBusy(false) }
    }

    return (
        <div style={{ margin: '10px 0' }}>
            <button className="linkbtn" type="button" onClick={() => void toggle()}>{open ? '목록 닫기' : '📥 내 글에서 가져오기'}</button>
            {open && (
                <div style={{ marginTop: 8, border: '2px solid var(--ink-2)', padding: 12, background: '#fff', fontSize: 16, lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 8px', color: 'var(--ink-2)' }}>‘주제 한 줄’ 모드에서는 제목(없으면 첫 문장)만 가져와요. 글 전체는 ‘글 바탕으로 이어 쓰기’를 고르면 들어와요. 칸에서 고칠 수 있고, 진짜 이름·학교는 지워 주세요.</p>
                    <b>📖 작가의 책상</b>
                    {!deskKey && <p style={{ margin: '4px 0' }}>이 기기에서 책상에 들어간 적이 없어요. 작가의 책상에서 열쇠로 먼저 들어가 주세요.</p>}
                    {deskKey && pieces && pieces.length === 0 && <p style={{ margin: '4px 0' }}>저장한 글이 아직 없어요.</p>}
                    {deskKey && pieces?.map((it) => (
                        <div key={it.id}><button className="linkbtn" type="button" disabled={busy} onClick={() => void fromDesk(it)}>{it.title || '제목 없음'} · {it.len}자</button></div>
                    ))}
                    <div style={{ marginTop: 10 }}><b>💬 이야기 교실</b></div>
                    {rooms.length === 0 && <p style={{ margin: '4px 0' }}>이 기기에서 들어간 방이 없어요.</p>}
                    {rooms.map((r) => (
                        <div key={r.code + r.nickname}><button className="linkbtn" type="button" disabled={busy} onClick={() => void fromRoom(r)}>방 {r.code} · {r.nickname}</button></div>
                    ))}
                    {busy && <p role="status" style={{ margin: '6px 0' }}>가져오는 중…</p>}
                    {msg && <p role="alert" style={{ margin: '6px 0', color: 'var(--tomato)' }}>{msg}</p>}
                </div>
            )}
        </div>
    )
}

const TOPIC_EXAMPLES = ['잃어버린 장갑을 찾는 하루', '처음 전학 온 날', '달에 사는 토끼의 편지']

/* ───────── 퀘스트 ───────── */
function QuestPanel({ toast, goDesk }: { toast: (m: string) => void; goDesk: () => void }) {
    const { writer, quests, activeQuestId, startQuest, setRawText, stamp, finishQuest, setActive, library } = useWriterStore()
    const w = writer!
    const active = quests.find((q) => q.id === activeQuestId && q.status !== 'done') ?? null
    const [genre, setGenre] = useState<GenreId>('fairytale')
    const [seed, setSeed] = useState('')
    const [mode, setMode] = useState<'topic' | 'continue'>('topic')
    const [useSamples, setUseSamples] = useState(false)
    const [warnOpen, setWarnOpen] = useState(false)
    const [checks, setChecks] = useState([false])
    const [copied, setCopied] = useState(false)
    const [paste, setPaste] = useState('')
    const [reasons, setReasons] = useState<Record<number, string>>({})
    const [fixes, setFixes] = useState<Record<number, string>>({})
    const [fixOpen, setFixOpen] = useState<Record<number, boolean>>({})

    if (!active) {
        const g = getGenre(genre)
        const ready = libraryReadiness(library.map((x) => x.text))
        const canMake = seed.trim().length >= 5
        const makeQuest = () => { startQuest(genre, buildPrompt(w.name, w.persona, genre, seed, { useLibrary: library.length > 0, mode, samples: useSamples ? library.slice(-MAX_SAMPLES).map((x) => x.text) : [] })); setSeed(''); setUseSamples(false); setChecks([false]); setCopied(false); setPaste('') }
        return (
            <>
                <p className="kicker">오늘의 퀘스트</p>
                <h2>무엇을 쓸까요?</h2>
                <div className="qguide"><b>이 화면에서 하는 일</b>
                    <p>내 글을 닮은 AI 작가에게 글을 부탁하는 <u>주문서</u>를 만드는 곳이에요. 아래 3칸만 채우면 돼요. 만든 주문서는 다음 화면에서 복사해서 ChatGPT나 Gemini에 붙여 넣어요.</p></div>
                <section className="qcard">
                    <h3><span className="no">1</span>장르 고르기</h3>
                    <p className="why">어떤 종류의 글을 받고 싶은지 골라요.</p>
                    <div className="seg" role="tablist">
                        {GENRES.filter((x) => x.unlockLevel <= w.level).map((x) => (
                            <button key={x.id} role="tab" aria-selected={genre === x.id} className={genre === x.id ? 'on' : ''} onClick={() => setGenre(x.id)}>{x.emoji} {x.title}</button>
                        ))}
                    </div>
                    {GENRES.some((x) => x.unlockLevel > w.level) && <p className="locked">🔒 {GENRES.filter((x) => x.unlockLevel > w.level).map((x) => `${x.title}는 레벨 ${x.unlockLevel}에서`).join(', ')} 열려요.</p>}
                    <p style={{ margin: '6px 0' }}>{g.intro}</p>
                    <div className="mission">{g.mission}</div>
                </section>
                <section className="qcard">
                    <h3><span className="no">2</span>{mode === 'topic' ? '주제 쓰기' : '바탕 글 넣기'}</h3>
                    <p className="why">{mode === 'topic' ? '말투는 내 글에서 배우니까, 여기에는 오늘 쓸 주제만 짧게 써요.' : '내 글 한 편을 넣으면 AI가 그 글을 이어 쓰거나 고쳐 써요.'}</p>
                    <div className="seg" role="tablist" aria-label="씨앗 종류">
                        <button role="tab" aria-selected={mode === 'topic'} className={mode === 'topic' ? 'on' : ''} onClick={() => { setMode('topic'); setSeed((x) => x.slice(0, MAX_TOPIC)) }}>✨ 새 글 쓰기</button>
                        <button role="tab" aria-selected={mode === 'continue'} className={mode === 'continue' ? 'on' : ''} onClick={() => setMode('continue')}>📄 내 글 이어 쓰기</button>
                    </div>
                    <label className="dl"><dt>{mode === 'topic' ? `오늘의 주제 (${MAX_TOPIC}자까지, 진짜 이름·학교 없이)` : `바탕이 될 내 글 (${MAX_SEED}자까지, 진짜 이름·학교 없이)`}</dt>
                        <textarea className="paste" value={seed} maxLength={mode === 'topic' ? MAX_TOPIC : MAX_SEED} onChange={(e) => setSeed(e.target.value)} placeholder={mode === 'topic' ? '예: 비 오는 날 우산이 하나뿐인 두 친구(별이, 구름이)' : '이어 쓰거나 고치고 싶은 내 글을 넣어요'} />
                    </label>
                    {mode === 'topic' && (
                        <div className="chips" aria-label="예시 주제">
                            <small>막막하면 눌러 보세요:</small>
                            {TOPIC_EXAMPLES.map((t) => <button key={t} type="button" onClick={() => setSeed(t)}>{t}</button>)}
                        </div>
                    )}
                    <SeedImport onPick={(full, topic) => setSeed(mode === 'continue' ? full.slice(0, MAX_SEED) : topic)} />
                </section>
                <section className="qcard">
                    <h3><span className="no">3</span>내 글 준비 확인</h3>
                    <p className="why">AI가 내 말투를 배우려면 내 글이 여러 편 필요해요. 글은 ‘작가의 책상’과 ‘이야기 교실’에서 모여요.</p>
                    <div className="ready" role="status">
                        <div className="rbar" aria-hidden="true"><i style={{ width: `${ready.percent}%` }} /></div>
                        <p className="rnum"><b>{ready.current ? `${ready.current.emoji} ${ready.current.label}` : '🥚 아직 준비 중'}</b> · 내 글 {ready.pieces}편 · {ready.chars.toLocaleString()}자</p>
                        <p className="rmsg">{ready.current ? ready.current.msg : `${LIB_TIERS[0].pieces}편(${LIB_TIERS[0].chars}자 이상)이 되면 시작할 수 있어요.`}{ready.next && ready.current ? ` ${ready.next.emoji} ${ready.next.pieces}편이 되면 ‘${ready.next.label}’이에요.` : ''}</p>
                        {ready.short > 0 && <p className="rmsg">글자가 {MIN_PIECE_CHARS}자보다 짧은 글 {ready.short}편은 세지 않았어요. 조금만 더 써 볼까요?</p>}
                    </div>
                    
                    {library.length > 0 && (
                        <label style={{ display: 'block', fontSize: 16, margin: '10px 0 0' }}><input type="checkbox" checked={useSamples} onChange={(e) => setUseSamples(e.target.checked)} /> 내 글 샘플도 주문서에 붙이기 (최근 {Math.min(library.length, MAX_SAMPLES)}편 · 파일을 올릴 수 없을 때)</label>
                    )}
                </section>
                <div className="qgo">
                    <button className="qbtn" disabled={!canMake} onClick={() => (ready.tier < 0 ? setWarnOpen(true) : makeQuest())}>AI 주문서 만들기</button>
                    {!canMake && <span className="qreason">{mode === 'topic' ? '주제를 5자 이상 적으면 눌러져요' : '바탕 글을 5자 이상 넣으면 눌러져요'}</span>}
                </div>
                {warnOpen && (
                    <div className="qmodal" role="dialog" aria-modal="true" aria-labelledby="qwarn-t" onClick={() => setWarnOpen(false)}>
                        <div className="qbox" onClick={(e) => e.stopPropagation()}>
                            <h3 id="qwarn-t">내 글이 아직 적어요</h3>
                            <p>지금 내 글은 {ready.pieces}편 · {ready.chars.toLocaleString()}자예요. AI가 내 말투를 잘 배우려면 {LIB_TIERS[0].pieces}편({LIB_TIERS[0].chars}자) 이상이 좋아요.</p>
                            <p>그래도 만들 수 있지만, 나를 덜 닮은 글이 나올 수 있어요. 계속할까요?</p>
                            <div className="qbtns">
                                <button type="button" className="qbtn" autoFocus onClick={() => setWarnOpen(false)}>글 더 모으러 갈게요</button>
                                <button type="button" className="backbtn" style={{ marginTop: 0 }} onClick={() => { setWarnOpen(false); makeQuest() }}>그래도 만들래요</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    const g = getGenre(active.genre)
    const hits = checkPrivacy(active.prompt)
    const allChecked = checks.every(Boolean)
    const copy = async (text: string) => {
        try { await navigator.clipboard.writeText(text); setCopied(true); toast('복사했어요! AI 창에 붙여넣어 보세요') } catch { toast('복사가 안 돼요. 글을 직접 드래그해서 복사해 주세요') }
    }
    const allStamped = active.stanzas.length > 0 && active.stanzas.every((s) => s.stamp)
    const doStamp = (i: number, kind: StampKind) => {
        const reason = (reasons[i] ?? '').trim()
        if (reason.length < MIN_REASON) return toast('이유를 한 줄 적어 주세요')
        const orig = active.stanzas[i].text
        const fixed = fixes[i] ?? orig
        if (kind === 'fix' && fixed.trim() === orig.trim()) { setFixOpen({ ...fixOpen, [i]: true }); return toast('고친 글을 아래 칸에 써 주세요') }
        stamp(active.id, i, kind, reason, kind === 'fix' ? fixed : undefined)
    }

    return (
        <>
            <p className="kicker">{g.emoji} {g.title} 퀘스트</p>
            <h2>글 한 편 완성하기</h2>
            <p className="lead">{g.mission}</p>
            <ol className="steps">
                <li className="step done"><span className="no">1</span><h3>오늘의 주제</h3><p className="reasontxt">주제와 설정서로 AI 주문서를 만들었어요.</p></li>

                <li className={`step${copied ? ' done' : ''}`}><span className="no">2</span>
                    <h3>AI 주문서 복사하기</h3>
                    {active.prompt.includes('첨부한 "내 글 모음"') && <FileGuide toast={toast} />}
                    <div className="promptbox" style={{ whiteSpace: 'pre-wrap' }}>{active.prompt}</div>
                    <p className="note" style={{ marginTop: 8 }}><b>{SAFETY_GUIDE.title}</b> — {SAFETY_GUIDE.intro}</p>
                    {SAFETY_GUIDE.checks.map((c, i) => (
                        <label key={c} style={{ display: 'block', fontSize: 16 }}><input type="checkbox" checked={checks[i]} onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))} /> {c}</label>
                    ))}
                    {hits.length > 0 && (
                        <div className="mission" style={{ background: '#FFF3B0' }}>
                            개인정보처럼 보이는 말이 있어요: {hits.map((h) => `${h.label}(${h.text})`).join(', ')}
                            <div><button className="linkbtn" disabled={!allChecked} onClick={() => copy(maskHits(active.prompt, hits))}>가려서 복사하기</button>{' '}
                                <button className="linkbtn" disabled={!allChecked} onClick={() => window.confirm('정말 이대로 복사할까요?') && copy(active.prompt)}>그래도 복사</button></div>
                        </div>
                    )}
                    {hits.length === 0 && <button className="linkbtn" disabled={!allChecked} onClick={() => copy(active.prompt)}>{allChecked ? 'AI 주문서 복사하기' : '위 체크를 모두 해야 복사할 수 있어요'}</button>}
                    <p className="note">{SAFETY_GUIDE.note}</p>
                    {!active.stanzas.length && (
                        <button type="button" className="backbtn" onClick={() => { setActive(null); setChecks([false]); setCopied(false); setPaste('') }}>← 1단계로 돌아가 주제 고치기</button>
                    )}
                </li>

                <li className={`step${active.stanzas.length ? ' done' : ''}${copied ? '' : ' lock'}`}><span className="no">3</span>
                    <h3>AI의 글 붙여넣기</h3>
                    <p>Gemini나 ChatGPT에 AI 주문서를 넣고 나온 글을 여기에 붙여요.</p>
                    {!active.stanzas.length ? (
                        <>
                            <textarea className="paste" value={paste} maxLength={MAX_RAW} onChange={(e) => setPaste(e.target.value)} disabled={!copied} aria-label="AI가 쓴 글" />
                            <button className="linkbtn" disabled={paste.trim().length < 10} onClick={() => setRawText(active.id, paste)}>붙여넣기 완료</button>
                        </>
                    ) : <p className="reasontxt">{active.stanzas.length}개 문단으로 나눴어요. ({g.splitHint})</p>}
                </li>

                <li className={`step${allStamped ? ' done' : ''}${active.stanzas.length ? '' : ' lock'}`}><span className="no">4</span>
                    <h3>편집장 도장 찍기</h3>
                    <p>문단마다 내 판단을 도장으로 남겨요. 채택 +{STAMP_XP.adopt} · 고침 +{STAMP_XP.fix} · 폐기 +{STAMP_XP.discard} XP</p>
                    {active.stanzas.map((s, i) => (
                        <div className="stanza" key={i}>
                            <q style={{ whiteSpace: 'pre-wrap' }}>{s.fixedText || s.text}</q>
                            {s.stamp ? (
                                <><span className={`mark ${STAMP_CLASS[s.stamp]}`}>{STAMP_LABEL[s.stamp]}</span><div className="reasontxt">이유: {s.reason}</div></>
                            ) : (
                                <>
                                    <div className="reason"><input value={reasons[i] ?? ''} maxLength={60} placeholder="왜 그렇게 정했나요? (한 줄)" onChange={(e) => setReasons({ ...reasons, [i]: e.target.value })} aria-label="도장 이유" /></div>
                                    {fixOpen[i] && <textarea className="paste" style={{ marginTop: 8, minHeight: 64 }} defaultValue={s.text} onChange={(e) => setFixes({ ...fixes, [i]: e.target.value })} aria-label="고친 글" />}
                                    <div className="stamps">
                                        <button className="stamp" onClick={() => doStamp(i, 'adopt')}>채택</button>
                                        <button className="stamp" onClick={() => { if (!fixOpen[i]) setFixOpen({ ...fixOpen, [i]: true }); else doStamp(i, 'fix') }}>{fixOpen[i] ? '고침 도장' : '고쳐 쓰기'}</button>
                                        <button className="stamp s-bad" onClick={() => doStamp(i, 'discard')}>폐기</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </li>
            </ol>
            {allStamped && (
                <>
                    <div className="clear">퀘스트 완료! 도장을 모두 찍었어요 🎉</div>
                    <button className="linkbtn" onClick={() => { finishQuest(active.id); setActive(null); toast('도감에 기록했어요'); goDesk() }}>책상으로 가서 책 만들기</button>
                </>
            )}
        </>
    )
}

/* ───────── 도감 ───────── */
function DexPanel({ doneGenres, level }: { doneGenres: Set<GenreId>; level: number }) {
    return (
        <>
            <p className="kicker">책장</p>
            <h2>장르 도감</h2>
            <p className="lead">퀘스트를 끝낸 장르는 도감에 채워져요.</p>
            <ul className="dex">
                {GENRES.map((g) => {
                    const locked = g.unlockLevel > level
                    return (
                        <li key={g.id} className={locked ? 'lk' : doneGenres.has(g.id) ? 'ok' : ''}>
                            <div className="cv">{g.emoji}</div><div className="nm">{g.title}</div>
                            {locked && <div className="reasontxt">Lv.{g.unlockLevel}에 열려요</div>}
                        </li>
                    )
                })}
            </ul>
            {GENRES.map((g) => (<div key={g.id} className="note"><b>{g.title}</b> — {g.traits.join(' · ')}</div>))}
        </>
    )
}

/* ───────── 책상: 책으로 보내기 ───────── */
function DeskPanel({ toast }: { toast: (m: string) => void }) {
    const { writer, quests } = useWriterStore()
    const user = useAuthStore((s) => s.user)
    const navigate = useNavigate()
    const done = quests.filter((q) => q.status === 'done')
    const [pick, setPick] = useState<string>(done[done.length - 1]?.id ?? '')
    const [title, setTitle] = useState('')
    const [busy, setBusy] = useState(false)
    const q = done.find((x) => x.id === pick)

    const send = async () => {
        if (!user || !writer || !q) return
        setBusy(true)
        const id = await sendToBook(user.id, writer, q, title.trim() || `${writer.name}의 ${getGenre(q.genre).title}`)
        setBusy(false)
        if (id) { toast('책이 만들어졌어요!'); navigate(`/edit/${id}`) } else toast('책 만들기에 실패했어요. 다시 시도해 주세요')
    }

    return (
        <>
            <p className="kicker">책상</p>
            <h2>내 책 만들기</h2>
            <p className="lead">도장을 모두 찍은 글만 책이 될 수 있어요. 폐기한 문단은 빠지고, 마지막 쪽에 제작 노트가 붙어요.</p>
            {!done.length ? <div className="locked">아직 완성한 퀘스트가 없어요. 오늘의 퀘스트를 먼저 끝내 보세요.</div> : (
                <>
                    <div className="seg">
                        {done.map((d) => <button key={d.id} className={pick === d.id ? 'on' : ''} onClick={() => setPick(d.id)}>{getGenre(d.genre).emoji} {getGenre(d.genre).title}</button>)}
                    </div>
                    {q && <ul className="pages">{q.stanzas.filter((s) => s.stamp !== 'discard').map((s, i) => (<li key={i}><span className="n">{i + 1}</span><span style={{ whiteSpace: 'pre-wrap' }}>{s.fixedText || s.text}</span><span className="t">{STAMP_LABEL[s.stamp!]}</span></li>))}</ul>}
                    <label className="dl"><dt>책 제목</dt><input className="wr-input" value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)} placeholder="비워 두면 자동으로 지어요" /></label>
                    {user ? <button className="linkbtn" disabled={busy || !q} onClick={send}>{busy ? '만드는 중…' : '플립북으로 보내기'}</button>
                        : <p className="note">책으로 저장하려면 <Link to="/login" style={{ textDecoration: 'underline' }}>로그인</Link>이 필요해요.</p>}
                </>
            )}
            <LibrarySection toast={toast} />
        </>
    )
}

// 퀘스트 2단계: 내 글 모음 파일을 받아 AI에 올리는 방법 (주문서에 파일 문구가 있을 때만)
function FileGuide({ toast }: { toast: (m: string) => void }) {
    const { writer, quests, library } = useWriterStore()
    const [bad, setBad] = useState<{ title: string; found: string }[]>([])
    if (!writer) return null
    const sources = exportSources(library, quests)
    const download = () => {
        const p = privacyProblems(sources, '')
        setBad(p)
        if (p.length) return toast('개인정보가 든 글이 있어요. 먼저 고쳐 주세요')
        downloadText(`${writer.name}-내글모음.txt`, buildExportText(writer, sources))
        toast('내려받았어요! AI에 올려 보세요')
    }
    return (
        <div className="mission" style={{ margin: '12px 0' }}>
            <b>먼저 내 글 모음 파일을 AI에 올려요</b>
            <ol className="howto">
                <li><button className="linkbtn" onClick={download}>내 글 모음 내려받기</button></li>
                <li><b>ChatGPT:</b> 임시 채팅 말고 <b>프로젝트</b>를 만들고, &ldquo;소스&rdquo;에 파일을 올려요.</li>
                <li><b>Gemini:</b> 노트북에서 &ldquo;소스 추가&rdquo;로 파일을 올려요.</li>
                <li>그 프로젝트·노트북 안에서 아래 AI 주문서를 붙여넣어요.</li>
            </ol>
            {bad.map((p) => <p key={p.title} style={{ margin: '4px 0 0' }}>「{p.title}」에 개인정보({p.found})로 보이는 부분이 있어요. 글을 고치거나 책장에서 빼 주세요.</p>)}
        </div>
    )
}

// 내 글 책장: 책상·이야기 교실에서 보내 온 글 + 내려받기
function LibrarySection({ toast }: { toast: (m: string) => void }) {
    const { writer, quests, library, removeFromLibrary } = useWriterStore()
    const [problems, setProblems] = useState<{ title: string; found: string }[]>([])
    if (!writer) return null
    const sources = exportSources(library, quests)

    const download = () => {
        const bad = privacyProblems(sources, '')
        setProblems(bad)
        if (bad.length) return toast('개인정보가 든 글이 있어요. 먼저 고쳐 주세요')
        downloadText(`${writer.name}-내글모음.txt`, buildExportText(writer, sources))
        toast('내려받았어요! AI에 올려 보세요')
    }

    return (
        <section className="lib" aria-label="내 글 책장">
            <h3>내 글 책장</h3>
            <p className="lead">작가의 책상이나 이야기 교실에서 &ldquo;AI 작가에게 보여주기&rdquo;를 누른 글이 여기 모여요. 글이 쌓일수록 AI가 내 말투를 더 잘 따라 해요.</p>
            {!library.length ? (
                <div className="locked">아직 책장이 비어 있어요. <Link to="/desk" style={{ textDecoration: 'underline' }}>작가의 책상</Link>이나 <Link to="/together" style={{ textDecoration: 'underline' }}>이야기 교실</Link>에서 글을 써 보세요.</div>
            ) : (
                <ul className="pages">
                    {library.map((x) => (
                        <li key={x.id}>
                            <span className="n">{x.source === 'desk' ? '책상' : '교실'}</span>
                            <span>{x.title} <small style={{ color: 'var(--ink-2)' }}>· {x.text.length}자</small></span>
                            <button className="t" onClick={() => removeFromLibrary(x.id)} aria-label={`${x.title} 책장에서 빼기`}>빼기</button>
                        </li>
                    ))}
                </ul>
            )}
            {problems.length > 0 && (
                <div className="locked" role="alert">
                    {problems.map((p) => <p key={p.title} style={{ margin: '0 0 4px' }}>「{p.title}」에 개인정보({p.found})로 보이는 부분이 있어요. 글을 고쳐서 다시 보여주거나, 책장에서 빼 주세요.</p>)}
                </div>
            )}
            {sources.length > 0 && (
                <>
                    <p className="note">특징 카드와 함께 글 {sources.length}편을 파일 하나로 내려받아요. 내려받기 전에 이름·학교·전화번호가 없는지 자동으로 살펴봐요.</p>
                    <button className="linkbtn" onClick={download}>내 글 모음 내려받기</button>
                    <ol className="howto">
                        <li><b>ChatGPT:</b> 프로젝트를 만들고 &ldquo;파일 추가&rdquo;로 이 파일을 올려요.</li>
                        <li><b>Gemini:</b> 노트북(NotebookLM)을 만들고 &ldquo;소스 추가&rdquo;로 이 파일을 올려요.</li>
                        <li>그다음 오늘의 퀘스트에서 AI 주문서를 복사해 그 프로젝트·노트북 안에서 붙여넣어요.</li>
                        <li>파일을 올릴 수 없다면 파일을 열어 글 몇 편을 주문서 아래에 붙여 넣어도 돼요.</li>
                    </ol>
                </>
            )}
        </section>
    )
}

/* ───────── 설정서 ───────── */
function SheetPanel({ toast, mood, onMood }: { toast: (m: string) => void; mood: Mood; onMood: (m: Mood) => void }) {
    const { writer, updateLook, reset } = useWriterStore()
    const w = writer!
    return (
        <>
            <p className="kicker">작가 설정서</p>
            <h2>{w.name}</h2>
            <dl className="dl">
                <dt>성격</dt><dd>{w.persona.personality || '-'}</dd>
                <dt>말투</dt><dd>{w.persona.tone || '-'}</dd>
                <dt>좋아하는 것</dt><dd>{w.persona.likes || '-'}</dd>
                <dt>쓰지 않는 것</dt><dd>{w.persona.avoids || '-'}</dd>
            </dl>
            <div className="dl"><dt>모습 꾸미기</dt>
                <LookEditor look={normalizeLook(w.look)} level={w.level} onChange={updateLook} mood={mood} onMood={onMood} />
            </div>
            <p className="note">이 기기의 브라우저에 저장돼요. 다른 기기에서는 보이지 않아요.</p>
            <ClassSection toast={toast} />
            <div className="resetrow">
                <button className="linkbtn" onClick={() => { if (window.confirm(`정말 ${w.name} 작가를 지우고 처음부터 다시 만들까요?\n\n레벨, 경험치, 써 온 글 기록이 모두 사라지고 되돌릴 수 없어요.\n(이미 플립북으로 보낸 책은 그대로 남아요)`)) { reset(); toast('새로 시작해요') } }}>처음부터 다시 만들기</button>
                <span>작가를 새로 고르고 싶을 때 눌러요</span>
            </div>
        </>
    )
}

// 선생님께 보여주기: 숫자(레벨·도장 수 등)와 별명만 보낸다. 글 내용은 보내지 않는다
function ClassSection({ toast }: { toast: (m: string) => void }) {
    const [m, setM] = useState<ClassMembership | null>(() => loadMembership())
    const [code, setCode] = useState('')
    const [nick, setNick] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    useEffect(() => {
        const on = () => setM(loadMembership())
        window.addEventListener('ai-writer-class-change', on)
        return () => window.removeEventListener('ai-writer-class-change', on)
    }, [])
    const join = async () => {
        setBusy(true); setErr('')
        try { setM(await joinClass(code, nick)); toast('선생님께 보여주기를 켰어요') }
        catch (e) { setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요') }
        finally { setBusy(false) }
    }
    const off = async () => {
        if (!m || !window.confirm('선생님께 보여주기를 끌까요?\n선생님 화면에서 내 기록이 지워져요. 내 작가는 그대로예요.')) return
        setBusy(true)
        await leaveClass(m)
        setM(null); setBusy(false); toast('보여주기를 껐어요')
    }
    return (
        <div className="lib" style={{ marginTop: 28 }}>
            <h3>선생님께 보여주기</h3>
            {m ? (
                <>
                    <p className="note" style={{ marginTop: 6 }}>켜져 있어요 · 교실 {m.code} · 별명 <b>{m.nickname}</b></p>
                    <p className="note">레벨, 도장 수 같은 <b>숫자만</b> 가요. 내가 쓴 글은 가지 않아요.</p>
                    <div className="resetrow">
                        <button className="linkbtn" disabled={busy} onClick={async () => { setBusy(true); await sendReport(m); setBusy(false); toast('숫자를 보냈어요') }}>지금 숫자 보내기</button>
                        <button className="linkbtn" disabled={busy} onClick={off}>끄기</button>
                    </div>
                </>
            ) : (
                <>
                    <p className="note" style={{ marginTop: 6 }}>선생님이 알려 준 <b>교실 번호</b>와 내 <b>별명</b>을 쓰면, 선생님이 내 작가의 레벨을 볼 수 있어요. 글 내용은 가지 않고 숫자만 가요.</p>
                    <label className="dl"><dt>교실 번호 (숫자 6개)</dt>
                        <input className="wr-input" inputMode="numeric" maxLength={6} value={code} placeholder="예: 123456" onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                    </label>
                    <label className="dl"><dt>내 별명 (본명 말고 별명)</dt>
                        <input className="wr-input" maxLength={12} value={nick} placeholder="예: 달빛" onChange={(e) => setNick(e.target.value)} />
                    </label>
                    {err && <p className="note" role="alert" style={{ color: 'var(--tomato)' }}>{err}</p>}
                    <button className="linkbtn" disabled={busy || code.length !== 6 || nick.trim().length < 1} onClick={join}>선생님께 보여주기 켜기</button>
                </>
            )}
            <p className="note"><Link to="/writer/teacher">선생님이세요? 교사 보기</Link></p>
        </div>
    )
}
