import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/writer.css'
import { useWriterStore } from '../store/writerStore'
import { useAuthStore } from '../store/authStore'
import Character from '../components/writer/Character'
import LookEditor from '../components/writer/LookEditor'
import { DEFAULT_LOOK, normalizeLook } from '../data/charParts'
import { EVENT_MOOD, getTemper, moodLine } from '../lib/writerLook'
import { GENRES, getGenre } from '../data/genres'
import { SAFETY_GUIDE } from '../data/safetyGuide'
import { checkPrivacy, maskHits } from '../lib/privacyCheck'
import { buildPrompt, MAX_RAW, MAX_SEED, MIN_REASON, STAMP_LABEL, STAMP_XP, xpForNext } from '../lib/writerPrompt'
import { sendToBook } from '../lib/writerBook'
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
function CreateWriter() {
    const createWriter = useWriterStore((s) => s.createWriter)
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
    return (
        <div className="wr" style={{ minHeight: '100vh' }}>
            <div className="wrap">
                <header className="top"><h1>나만의 AI 작가 만들기</h1></header>
                <div className="grid">
                    <section className="sticky">
                        <div className="room" style={{ background: 'var(--wall)', padding: 24 }}>
                            <svg viewBox="0 0 160 230" style={{ width: '100%', maxHeight: 420 }} role="img" aria-label="내 AI 작가"><Character look={look} mood={pmood} temper={getTemper(persona)} /></svg>
                        </div>
                    </section>
                    <aside className="panel">
                        <p className="kicker">1단계</p>
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
                            <LookEditor look={look} level={1} persona={persona} onChange={setLook} mood={pmood} onMood={setPmood} />
                        </div>
                        <button className="linkbtn" style={{ marginTop: 24 }} disabled={name.trim().length < 1} onClick={() => createWriter(name.trim(), persona, look)}>이 작가로 시작하기</button>
                        <p className="note">모자·안경 같은 꾸미기 부품은 레벨이 오르면 하나씩 열려요.</p>
                    </aside>
                </div>
            </div>
        </div>
    )
}

/* ───────── 방 ───────── */
function Room() {
    const { writer, quests, activeQuestId } = useWriterStore()
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
    const baseMood: Mood = active?.status === 'stamping' ? 'think' : view === 'desk' ? 'happy' : 'idle'
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
                                    <rect x="34" y="106" width="200" height="268" fill="#B07A48" /><rect x="46" y="118" width="176" height="244" fill="#8E5F34" />
                                    {GENRES.map((g, i) => (
                                        <g key={g.id} opacity={doneGenres.has(g.id) ? 1 : 0.35}>
                                            <rect x={58 + i * 50} y={142} width="38" height="54" fill={['#F7C844', '#E8553E', '#66A844'][i]} />
                                        </g>
                                    ))}
                                    <g stroke="#B07A48" strokeWidth="8"><line x1="46" y1="196" x2="222" y2="196" /><line x1="46" y1="276" x2="222" y2="276" /><line x1="46" y1="356" x2="222" y2="356" /></g>
                                    <rect className="hit" x="30" y="100" width="208" height="278" rx="4" />
                                    <g className="tag"><rect x="64" y="384" width="140" height="30" /><text x="134" y="406">장르 도감</text></g>
                                </g>

                                <g className={`obj${view === 'quest' ? ' on' : ''}`} aria-label={objs[1].aria} {...oc('quest')}>
                                    <rect x="562" y="62" width="206" height="170" fill="#A9743F" /><rect x="572" y="72" width="186" height="150" fill="#E0B27A" />
                                    <g transform="rotate(-4 610 120)"><rect x="586" y="88" width="72" height="64" fill="#fff" /><g stroke="#BDA98A" strokeWidth="3"><line x1="594" y1="104" x2="650" y2="104" /><line x1="594" y1="116" x2="642" y2="116" /><line x1="594" y1="128" x2="650" y2="128" /></g></g>
                                    <g transform="rotate(5 700 130)"><rect x="672" y="84" width="74" height="70" fill="var(--mustard)" /><text x="709" y="124" fontSize="20" fontWeight="700" textAnchor="middle" fill="var(--ink)" fontFamily="Gowun Dodum">퀘스트</text></g>
                                    <rect className="hit" x="558" y="58" width="214" height="178" />
                                    <g className="tag"><rect x="598" y="242" width="134" height="30" /><text x="665" y="264">오늘의 퀘스트</text></g>
                                </g>

                                <g className={`obj${view === 'desk' ? ' on' : ''}`} aria-label={objs[2].aria} {...oc('desk')}>
                                    <rect x="548" y="338" width="228" height="20" fill="#B07A48" /><rect x="560" y="358" width="14" height="60" fill="#8E5F34" /><rect x="750" y="358" width="14" height="60" fill="#8E5F34" />
                                    <polygon points="590,336 662,322 662,338 590,342" fill="#fff" /><polygon points="662,322 734,336 734,342 662,338" fill="#FFF8E7" />
                                    <rect className="hit" x="544" y="292" width="236" height="130" />
                                    <g className="tag"><rect x="594" y="424" width="132" height="30" /><text x="660" y="446">내 책 만들기</text></g>
                                </g>

                                <g transform="translate(320 214)">
                                    <g className={`obj${view === 'writer' ? ' on' : ''}`} aria-label={objs[3].aria} {...oc('writer')}>
                                        <Character look={w.look} mood={mood} temper={temper} />
                                        <rect className="hit" x="10" y="0" width="140" height="224" />
                                        <g className="tag"><rect x="10" y="238" width="140" height="30" /><text x="80" y="260">작가 설정서</text></g>
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

/* ───────── 퀘스트 ───────── */
function QuestPanel({ toast, goDesk }: { toast: (m: string) => void; goDesk: () => void }) {
    const { writer, quests, activeQuestId, startQuest, setRawText, stamp, finishQuest, setActive } = useWriterStore()
    const w = writer!
    const active = quests.find((q) => q.id === activeQuestId && q.status !== 'done') ?? null
    const [genre, setGenre] = useState<GenreId>('fairytale')
    const [seed, setSeed] = useState('')
    const [checks, setChecks] = useState([false, false, false])
    const [copied, setCopied] = useState(false)
    const [paste, setPaste] = useState('')
    const [reasons, setReasons] = useState<Record<number, string>>({})
    const [fixes, setFixes] = useState<Record<number, string>>({})
    const [fixOpen, setFixOpen] = useState<Record<number, boolean>>({})

    if (!active) {
        const g = getGenre(genre)
        return (
            <>
                <p className="kicker">오늘의 퀘스트</p>
                <h2>무엇을 쓸까요?</h2>
                <p className="lead">장르를 고르고 이야기 씨앗을 적어요.</p>
                <div className="seg" role="tablist">
                    {GENRES.filter((x) => x.unlockLevel <= w.level).map((x) => (
                        <button key={x.id} role="tab" aria-selected={genre === x.id} className={genre === x.id ? 'on' : ''} onClick={() => setGenre(x.id)}>{x.emoji} {x.title}</button>
                    ))}
                </div>
                {GENRES.some((x) => x.unlockLevel > w.level) && <p className="locked">잠긴 장르가 있어요. 레벨이 오르면 열려요.</p>}
                <p style={{ margin: '6px 0' }}>{g.intro}</p>
                <div className="mission">{g.mission}</div>
                <label className="dl"><dt>이야기 씨앗 (진짜 이름·학교 없이, 지어낸 이야기로)</dt>
                    <textarea className="paste" value={seed} maxLength={MAX_SEED} onChange={(e) => setSeed(e.target.value)} placeholder="예: 비 오는 날 우산이 하나뿐인 두 친구(별이, 구름이)" />
                </label>
                <button className="linkbtn" disabled={seed.trim().length < 5} onClick={() => { startQuest(genre, buildPrompt(w.name, w.persona, genre, seed)); setSeed(''); setChecks([false, false, false]); setCopied(false); setPaste('') }}>지침 만들기</button>
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
                <li className="step done"><span className="no">1</span><h3>이야기 씨앗</h3><p className="reasontxt">씨앗과 설정서로 지침을 만들었어요.</p></li>

                <li className={`step${copied ? ' done' : ''}`}><span className="no">2</span>
                    <h3>지침 복사하기</h3>
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
                    {hits.length === 0 && <button className="linkbtn" disabled={!allChecked} onClick={() => copy(active.prompt)}>{allChecked ? '지침 복사하기' : '위 체크를 모두 해야 복사할 수 있어요'}</button>}
                    <p className="note">{SAFETY_GUIDE.note}</p>
                </li>

                <li className={`step${active.stanzas.length ? ' done' : ''}${copied ? '' : ' lock'}`}><span className="no">3</span>
                    <h3>AI의 글 붙여넣기</h3>
                    <p>Gemini나 ChatGPT에 지침을 넣고 나온 글을 여기에 붙여요.</p>
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
        </>
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
                <LookEditor look={normalizeLook(w.look)} level={w.level} persona={w.persona} onChange={updateLook} mood={mood} onMood={onMood} />
            </div>
            <p className="note">이 기기의 브라우저에 저장돼요. 다른 기기에서는 보이지 않아요.</p>
            <button className="linkbtn" onClick={() => { if (window.confirm('작가와 기록을 모두 지우고 새로 시작할까요?')) { reset(); toast('새로 시작해요') } }}>처음부터 다시 시작</button>
        </>
    )
}
