import { useEffect, useRef, useState } from 'react'
import { deskGet, type DeskSession } from '../lib/desk'
import { getClassLogCtx, viaClassLog, submitToClass, CLASSLOG_URL } from '../lib/classlog'

type Phase = 'idle' | 'sending' | 'done' | 'err'

// 서재·전체 탭이 함께 쓰는 [선생님께 제출] 버튼.
// 누르면 "내는 중…" → "✔ 제출 완료!" 로 바뀌고, 클래스로그AI로 들어오지 않았으면 안내 창을 보여 준다.
export default function DeskSubmit({ session, id, disabled, label = '선생님께 제출' }: {
  session: DeskSession
  id: string | null
  disabled?: boolean
  label?: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [err, setErr] = useState('')
  const [guide, setGuide] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => { window.clearTimeout(timer.current); setPhase('idle'); setErr('') }, [id]) // 다른 책을 고르면 처음 상태로

  const go = async () => {
    if (!id || phase === 'sending') return
    const ctx = getClassLogCtx()
    if (!viaClassLog(ctx)) { setGuide(true); return }
    window.clearTimeout(timer.current)
    setPhase('sending'); setErr('')
    try {
      await submitToClass(await deskGet(session.key, id), ctx)
      setPhase('done')
      timer.current = window.setTimeout(() => setPhase('idle'), 2500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '제출하지 못했어요')
      setPhase('err')
    }
  }
  const close = () => { window.clearTimeout(timer.current); setPhase('idle') }
  useEffect(() => {
    if (phase !== 'done' && phase !== 'err') return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [phase])

  return (
    <>
      <button type="button" className="btn sub sbm" disabled={disabled || !id || phase === 'sending'} onClick={() => void go()}>
        {label}
      </button>
      {phase !== 'idle' && (
        <div className="sbm-pop" onClick={phase === 'sending' ? undefined : close}>
          <div className={'sbm-card ' + phase} role={phase === 'err' ? 'alertdialog' : 'status'} aria-live="polite" aria-modal="true" onClick={e => e.stopPropagation()}>
            {phase === 'sending' && <>
              <span className="sbm-ico env" aria-hidden="true">✉</span>
              <b>제출 중…</b>
              <small>선생님께 보내고 있어요</small>
            </>}
            {phase === 'done' && <>
              <span className="sbm-ico ok" aria-hidden="true">✔</span>
              <b>제출 완료!</b>
              <small>선생님께 잘 전달됐어요</small>
              <button className="btn" type="button" autoFocus onClick={close}>확인</button>
            </>}
            {phase === 'err' && <>
              <span className="sbm-ico bad" aria-hidden="true">!</span>
              <b>제출하지 못했어요</b>
              <small>{err}</small>
              <div>
                <button className="btn" type="button" autoFocus onClick={() => void go()}>다시 하기</button>
                <button className="btn sub" type="button" onClick={close}>닫기</button>
              </div>
            </>}
          </div>
        </div>
      )}
      {guide && (
        <div className="ask" onClick={() => setGuide(false)}>
          <div className="box" role="dialog" aria-modal="true" aria-label="클래스로그AI 안내" onClick={e => e.stopPropagation()}>
            <p>클래스로그AI로 들어와야<br />글이 제출돼요</p>
            <small>내 글이 내 이름으로 선생님께 바로 도착해요. 지금 이 화면의 글은 서재에 안전하게 있어요.</small>
            <div>
              <a className="btn" href={CLASSLOG_URL} target="_blank" rel="noopener">클래스로그AI로 입장하기</a>
              <button className="btn sub" type="button" onClick={() => setGuide(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
