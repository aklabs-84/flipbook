import { useEffect, useRef, useState } from 'react'
import { useAsk } from './useAsk'
import {
  pagesGet, pageSave, shrinkImage, bgOf, emojiOf, bgmSave, fileToDataUrl,
  type RelayLine, type RelayMember, type PageData,
} from '../../lib/relay'

interface Props {
  code: string
  token: string
  me: number
  lines: RelayLine[]
  members: RelayMember[]
  leader: number | null
  bgmName: string | null
  onRefreshLines: () => Promise<void>
  onBack: () => void
}

interface Draft { img: string | null; font: number; dirty: boolean }

const COLORS = ['#4A3228', '#E8553E', '#F7C844', '#66A844', '#2E7DBF', '#8A6BBE', '#FFFFFF']

export default function PageDecorator({ code, token, me, lines, members, leader, bgmName, onRefreshLines, onBack }: Props) {
  const bgmRef = useRef<HTMLInputElement>(null)
  const [bgmBusy, setBgmBusy] = useState(false)
  const [bgmMsg, setBgmMsg] = useState('')
  const isLeader = leader !== null && leader === me
  async function pickBgm(f?: File) {
    if (!f) return
    if (!f.type.startsWith('audio/')) { setBgmMsg('음악 파일(mp3 등)을 골라 주세요.'); return }
    if (f.size > 1.5 * 1024 * 1024) { setBgmMsg('음악이 너무 커요. 1.5MB 이하로 골라 주세요. (짧은 배경음악이 좋아요)'); return }
    setBgmBusy(true); setBgmMsg('')
    try {
      await bgmSave(code, token, f.name.replace(/\.[^.]+$/, ''), await fileToDataUrl(f))
      await onRefreshLines()
      setBgmMsg('책 음악을 정했어요! 🎵')
    } catch (e) { setBgmMsg(e instanceof Error ? e.message : '잠시 후 다시 해 보세요') }
    finally { setBgmBusy(false); if (bgmRef.current) bgmRef.current.value = '' }
  }
  async function clearBgm() {
    setBgmBusy(true); setBgmMsg('')
    try { await bgmSave(code, token, null, null); await onRefreshLines(); setBgmMsg('책 음악을 뺐어요.') }
    catch (e) { setBgmMsg(e instanceof Error ? e.message : '잠시 후 다시 해 보세요') }
    finally { setBgmBusy(false) }
  }
  const story = lines.filter(l => !l.sys && l.w !== null)
  const [sel, setSel] = useState(() => Math.max(0, story.findIndex(l => l.w === me)))
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const sinceRef = useRef<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { ask, box } = useAsk()

  function applyPages(ps: PageData[]) {
    setDrafts(old => {
      const next = { ...old }
      for (const p of ps) {
        // 내가 아직 저장하지 않은 고침은 지키고, 나머지는 서버 내용으로 바꾼다
        if (!next[p.seq]?.dirty) next[p.seq] = { img: p.img, font: p.font, dirty: false }
      }
      return next
    })
  }

  async function loadPages() {
    const r = await pagesGet(code, token, sinceRef.current)
    sinceRef.current = r.now
    applyPages(r.pages)
    return r.pages.length
  }

  useEffect(() => {
    setBusy(true)
    loadPages().catch(() => setMsg('쪽을 가져오지 못했어요. 🔄 새 쪽 확인을 눌러 봐요.')).finally(() => setBusy(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    setBusy(true); setMsg('')
    try {
      await onRefreshLines()
      const n = await loadPages()
      setMsg(n ? `친구 쪽 ${n}개를 새로 가져왔어요.` : '아직 새로 꾸민 쪽이 없어요.')
    } catch { setMsg('잘 안 됐어요. 다시 눌러 볼까요?') }
    finally { setBusy(false) }
  }

  const cur = story[sel]
  const owner = cur ? members.find(m => m.seq === cur.w) : undefined
  const mine = !!cur && cur.w === me
  const d: Draft = (cur && drafts[cur.seq]) || { img: null, font: 22, dirty: false }

  function patch(p: Partial<Draft>) {
    if (!cur) return
    setDrafts(old => ({ ...old, [cur.seq]: { ...(old[cur.seq] ?? { img: null, font: 22 }), ...p, dirty: true } as Draft }))
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    setBusy(true); setMsg('사진을 줄이는 중…')
    try { patch({ img: await shrinkImage(f) }); setMsg('사진을 넣었어요. 마음에 들면 💾 이 쪽 저장을 눌러요.') }
    catch (e) { setMsg(e instanceof Error ? e.message : '사진을 넣지 못했어요') }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function save() {
    if (!cur) return
    setBusy(true); setMsg('')
    try {
      await pageSave(code, token, cur.seq, d.img, d.font)
      setDrafts(old => ({ ...old, [cur.seq]: { ...d, dirty: false } }))
      setMsg('저장했어요! 👍')
    } catch (e) { setMsg(e instanceof Error ? e.message : '저장하지 못했어요. 다시 눌러 봐요.') }
    finally { setBusy(false) }
  }

  function leave() {
    if (Object.values(drafts).some(x => x.dirty)) { ask('저장하지 않은 쪽이 있어요. 그래도 나갈까요?', onBack); return }
    onBack()
  }

  function go(i: number) { setSel(i); setMsg('') }

  return (
    <div className="pd">
      <h2>
        🎨 내 쪽 꾸미기
        <button className="link" type="button" onClick={leave}>← 이야기로 돌아가기</button>
      </h2>
      {box}
      <p className="sub">내가 쓴 문장이 내 쪽이에요. ✏️ 표시가 있는 쪽에 그림을 넣어 봐요.</p>

      <div className="pd-bgm">
        <b>🎵 책 음악</b>{' '}
        {bgmName ? <span>지금: {bgmName}</span> : <span>아직 정하지 않았어요</span>}
        {isLeader ? (
          <>
            <button className="btn ghost sm" type="button" disabled={bgmBusy} onClick={() => bgmRef.current?.click()}>{bgmBusy ? '올리는 중…' : '🎵 책 음악 고르기'}</button>
            {bgmName && <button className="btn ghost sm" type="button" disabled={bgmBusy} onClick={() => void clearBgm()}>음악 빼기</button>}
            <input ref={bgmRef} type="file" accept="audio/*" hidden onChange={e => void pickBgm(e.target.files?.[0])} />
            <div className="pd-note">👑 나는 방 대표예요! 우리 책에 깔릴 음악을 골라요. 저작권이 없는 음악만 써요. (1.5MB 이하)</div>
          </>
        ) : (
          <div className="pd-note">음악은 방 대표{leader !== null ? ` (${members.find(m => m.seq === leader)?.nickname ?? ''})` : ''} 친구만 고를 수 있어요.</div>
        )}
        {bgmMsg && <div className="pd-note" role="status">{bgmMsg}</div>}
      </div>

      {story.length === 0 ? (
        <div className="empty">아직 쓴 이야기가 없어요. 이야기가 쓰이면 쪽이 생겨요.</div>
      ) : (
        <>
          <div className="pd-tabs" role="tablist">
            {story.map((l, i) => {
              const m = members.find(x => x.seq === l.w)
              const done = !!drafts[l.seq]?.img
              return (
                <button key={l.seq} role="tab" aria-selected={i === sel} type="button"
                  className={`${i === sel ? 'on' : ''}${l.w === me ? ' mine' : ''}`} onClick={() => go(i)}>
                  {m ? emojiOf(m.emoji) : ''} {i + 1}쪽{l.w === me ? ' ✏️' : ''}{done ? ' ✔' : ''}
                </button>
              )
            })}
          </div>

          <div className="pd-page">
            <div className="art">
              {d.img ? <img src={d.img} alt={`${sel + 1}쪽 그림`} />
                : <div className="none">{mine ? <>📷 여기에 그림을<br />넣어 주세요</> : '아직 그림이 없어요'}</div>}
            </div>
            <div className="tx" style={{ fontSize: d.font }}>{cur?.t}</div>
          </div>
          <p className="pd-who">
            {owner && <i style={{ background: bgOf(owner.emoji) }}>{emojiOf(owner.emoji)}</i>}
            {owner?.nickname}{mine ? ' (나)' : ''} 가 쓴 문장 · {mine ? '내가 꾸밀 수 있어요' : '친구 쪽이라 구경만 해요'}
          </p>

          {mine && (
            <>
              <div className="pd-tools">
                <button className="btn" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>📷 종이 그림 사진 올리기</button>
                <button className="btn ghost" type="button" disabled={busy} onClick={() => setDrawing(true)}>🖍️ 화면에서 그리기</button>
                <div className="pd-step" aria-label="글자 크기">
                  <button type="button" aria-label="글자 작게" onClick={() => patch({ font: Math.max(12, d.font - 2) })}>A−</button>
                  <span>글자 크기 {d.font}</span>
                  <button type="button" aria-label="글자 크게" onClick={() => patch({ font: Math.min(60, d.font + 2) })}>A+</button>
                </div>
                {d.img && <button className="btn ghost sm" type="button" onClick={() => patch({ img: null })}>그림 지우기</button>}
                <button className="btn red save" type="button" disabled={busy || !d.dirty} onClick={() => void save()}>
                  {busy ? '잠깐만요…' : d.dirty ? '💾 이 쪽 저장' : '✔ 저장됨'}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => void onFile(e.target.files?.[0])} />
              <div className="pd-note">📌 사진에는 <b>얼굴·이름·학교 이름</b>이 나오지 않게 찍어요.</div>
            </>
          )}

          <div className="chk" style={{ marginTop: 12 }}>
            <button className="cbtn" type="button" disabled={busy} onClick={() => void refresh()}>🔄 새 쪽 확인</button>
            <div className="cmsg" role="status">{msg || '친구가 꾸민 쪽이 있는지 눌러서 확인해요.'}</div>
          </div>
        </>
      )}

      {drawing && (
        <DrawBoard
          onCancel={() => setDrawing(false)}
          onDone={async c => {
            try { patch({ img: await shrinkImage(c) }); setMsg('그림을 넣었어요. 💾 이 쪽 저장을 눌러요.') }
            catch (e) { setMsg(e instanceof Error ? e.message : '그림을 넣지 못했어요') }
            setDrawing(false)
          }}
        />
      )}
    </div>
  )
}

function DrawBoard({ onCancel, onDone }: { onCancel: () => void; onDone: (c: HTMLCanvasElement) => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(6)
  const [erase, setErase] = useState(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const hist = useRef<ImageData[]>([])

  useEffect(() => {
    const c = cv.current
    if (!c) return
    const g = c.getContext('2d')
    if (g) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height) }
  }, [])

  function pos(e: React.PointerEvent) {
    const c = cv.current!
    const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  function down(e: React.PointerEvent) {
    const c = cv.current!, g = c.getContext('2d')!
    if (hist.current.length > 15) hist.current.shift()
    hist.current.push(g.getImageData(0, 0, c.width, c.height))
    c.setPointerCapture(e.pointerId)
    last.current = pos(e)
    stroke(last.current, last.current)
  }
  function stroke(a: { x: number; y: number }, b: { x: number; y: number }) {
    const g = cv.current!.getContext('2d')!
    g.strokeStyle = erase ? '#fff' : color
    g.lineWidth = erase ? size * 3 : size
    g.lineCap = 'round'; g.lineJoin = 'round'
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke()
  }
  function move(e: React.PointerEvent) {
    if (!last.current) return
    const p = pos(e)
    stroke(last.current, p)
    last.current = p
  }
  function up() { last.current = null }
  function undo() {
    const c = cv.current!, g = c.getContext('2d')!
    const h = hist.current.pop()
    if (h) g.putImageData(h, 0, 0)
  }
  function clear() {
    const c = cv.current!, g = c.getContext('2d')!
    hist.current.push(g.getImageData(0, 0, c.width, c.height))
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
  }

  return (
    <div className="pd-draw" role="dialog" aria-label="그리기">
      <div className="box">
        <canvas ref={cv} width={480} height={640}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <div className="pd-colors">
          {COLORS.map(c => (
            <button key={c} type="button" aria-label={`색 ${c}`} className={!erase && color === c ? 'on' : ''}
              style={{ background: c }} onClick={() => { setColor(c); setErase(false) }} />
          ))}
          <button type="button" className={`er${erase ? ' on' : ''}`} onClick={() => setErase(!erase)}>🧽 지우개</button>
        </div>
        <div className="pd-colors">
          <label>굵기 <input type="range" min={2} max={20} value={size} onChange={e => setSize(Number(e.target.value))} /></label>
          <button type="button" className="er" onClick={undo}>↩ 되돌리기</button>
          <button type="button" className="er" onClick={clear}>전체 지우기</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" type="button" onClick={() => onDone(cv.current!)}>✔ 그림 넣기</button>
          <button className="btn ghost" type="button" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  )
}
