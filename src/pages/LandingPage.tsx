import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import '../styles/landing.css'

// 첫 화면 — docs/mockups/landing-B3.html 기준 (스크롤에 맞춰 책이 열리고 네 장면이 움직인다)
export default function LandingPage() {
    const { user } = useAuthStore()
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        const $ = <T extends Element>(sel: string) => root.querySelector(sel) as T
        const st = $<HTMLElement>('#lp-stage'), bk = $<HTMLElement>('#lp-bk'), hint = $<HTMLElement>('#lp-hint')
        const spine = $<HTMLElement>('#lp-spine'), blockL = $<HTMLElement>('#lp-blockL'), pencil = $<HTMLElement>('#lp-pencil')
        const leaves = Array.from(root.querySelectorAll<HTMLElement>('.lf[data-i]'))
        const caps = Array.from(root.querySelectorAll<HTMLElement>('.cap'))
        const chs = Array.from(root.querySelectorAll<HTMLElement>('.ch')).map(el => ({ el, pic: el.querySelector('.pic') as HTMLElement, t: 0, c: 0 }))
        const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
        const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
        const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
        const NAV = 64
        let target = 0, cur = 0, mx = 0, my = 0, tx = 0, ty = 0, capNow = -1, raf = 0
        const readScroll = () => {
            const vh = innerHeight - NAV
            target = clamp(-st.getBoundingClientRect().top / (st.offsetHeight - vh), 0, 1)
            chs.forEach(o => { o.t = clamp(-o.el.getBoundingClientRect().top / (o.el.offsetHeight - vh), 0, 1) })
        }
        const onMove = (e: PointerEvent) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5 }
        addEventListener('scroll', readScroll, { passive: true })
        addEventListener('resize', readScroll)
        addEventListener('pointermove', onMove, { passive: true })
        readScroll(); cur = target; chs.forEach(o => { o.c = o.t })
        const SPAN = [[0.06, 0.30], [0.26, 0.50], [0.46, 0.70], [0.66, 0.92]]
        const frame = (t: number) => {
            const k = reduce ? 1 : 0.05
            cur += (target - cur) * k; if (Math.abs(target - cur) < 0.0004) cur = target
            const p = cur
            st.style.setProperty('--p', p.toFixed(4))
            tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06
            const open = ease(clamp(p / 0.2, 0, 1))
            const small = innerWidth < 820
            const sc = 1 + (small ? 0.28 : 0.1) * (1 - open)
            const float = reduce ? 0 : Math.sin(t / 1700) * 4
            bk.style.transform = `translateX(${(-25 * (1 - open)).toFixed(2)}%) translateY(${float.toFixed(2)}px) scale(${sc.toFixed(3)}) rotateX(${(10 - open * 5 + ty * -4).toFixed(2)}deg) rotateY(${(-12 * (1 - open) + tx * 6).toFixed(2)}deg)`
            blockL.style.opacity = open.toFixed(3); spine.style.opacity = open.toFixed(3)
            leaves.forEach((l, i) => {
                const [a, b] = SPAN[i], kk = clamp((p - a) / (b - a), 0, 1), e = ease(kk), s = Math.sin(kk * Math.PI)
                l.style.transform = `rotateY(${(-180 * e).toFixed(2)}deg) skewY(${(-s * 2).toFixed(2)}deg)`
                l.style.zIndex = String(e > 0.5 ? 10 + i : 20 - i)
                const f = (l.children[0] as HTMLElement).firstElementChild as HTMLElement
                const r = (l.children[1] as HTMLElement).firstElementChild as HTMLElement
                f.style.opacity = (e < 0.5 ? s * 0.9 : 0).toFixed(3); r.style.opacity = (e >= 0.5 ? s * 0.9 : 0).toFixed(3)
            })
            const c = p < 0.08 ? 0 : p < 0.34 ? 1 : p < 0.62 ? 2 : 3
            if (c !== capNow) { capNow = c; caps.forEach((el, i) => el.classList.toggle('on', i === c)) }
            hint.style.opacity = p < 0.03 ? '1' : '0'
            chs.forEach((o, idx) => {
                o.c += (o.t - o.c) * k; if (Math.abs(o.t - o.c) < 0.0004) o.c = o.t
                o.pic.style.setProperty('--q', o.c.toFixed(4))
                if (idx === 0 && pencil) {
                    const total = clamp((o.c - 0.04) / 0.58, 0, 1) * 6, i = Math.min(5, Math.floor(total)), f = total - i
                    const ys = [52, 100, 140, 180, 220, 262], len = [120, 200, 180, 220, 120, 160]
                    const x = 30 + 76 + f * len[i], y = 10 + ys[i] + (i > 0 ? Math.sin(f * Math.PI * 6) * 7 : 0)
                    pencil.style.transform = `translate(${x.toFixed(1)}px,${(y - 10).toFixed(1)}px) rotate(-40deg)`
                    pencil.style.opacity = String(o.c > 0.62 ? Math.max(0, 1 - (o.c - 0.62) * 14) : 1)
                }
            })
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            removeEventListener('scroll', readScroll)
            removeEventListener('resize', readScroll)
            removeEventListener('pointermove', onMove)
        }
    }, [])

    return (
        <div className="lp" ref={rootRef}>
            <div className="stage" id="lp-stage">
              <div className="sticky">
                <div className="bgword" aria-hidden="true">플립북</div>

                <div className="caps">
                  <div className="cap on">
                    <small>FLIPBOOK</small>
                    <h1>우리 반 이야기가<br /><em>한 권의 책</em>이 돼요</h1>
                    <p>읽고, 쓰고, 함께 엮어 책장을 넘겨 보세요.</p>
                  </div>
                  <div className="cap">
                    <small>01 · 읽고</small>
                    <h2>내 서재의 책을<br /><em>펼쳐서</em> 읽어요</h2>
                    <p>발행한 글이 책으로 꽂히고, 한 쪽씩 넘기며 읽을 수 있어요.</p>
                  </div>
                  <div className="cap">
                    <small>02 · 쓰고</small>
                    <h2>글감에서 발행까지<br /><em>한 편</em>을 완성해요</h2>
                    <p>제목을 붙이고, 쓰고, 퇴고로 나다운 문장을 골라요.</p>
                  </div>
                  <div className="cap">
                    <small>03 · 함께 엮어</small>
                    <h2>모둠의 이야기를<br /><em>한 권</em>으로 묶어요</h2>
                    <p>이야기 교실에서 이어 쓴 글이 플립북이 돼요.</p>
                    <Link className="lnk" to="/desk">작가의 책상 열기 <b>→</b></Link>
                  </div>
                </div>

                <div className="area">
      
                  <svg className="dd d1" viewBox="0 0 130 80" aria-hidden="true"><path className="f1" d="M26 66a20 20 0 0 1 2-40 a28 28 0 0 1 54-4 a22 22 0 0 1 20 44z"/></svg>
                  <svg className="dd d2" viewBox="0 0 44 44" aria-hidden="true"><path className="f2" d="M22 2C24 16 28 20 42 22 28 24 24 28 22 42 20 28 16 24 2 22 16 20 20 16 22 2z"/></svg>
                  <svg className="dd d3" viewBox="0 0 170 34" aria-hidden="true"><g transform="rotate(0)"><path className="f2" d="M24 6h104v22H24z"/><path className="f3" d="M128 6h22a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-22z"/><path className="f1" d="M24 6 4 17l20 11z"/><path d="M12 14l-8 3 8 3"/><path d="M44 6v22M64 6v22"/></g></svg>
                  <svg className="dd d4" viewBox="0 0 44 44" aria-hidden="true"><path className="f3" d="M22 2C24 16 28 20 42 22 28 24 24 28 22 42 20 28 16 24 2 22 16 20 20 16 22 2z"/></svg>
                  <svg className="dd d5" viewBox="0 0 44 44" aria-hidden="true"><circle className="f5" cx="22" cy="22" r="14"/></svg>

                  <div className="scene" id="lp-scene" aria-hidden="true">
                    <div className="floor"></div>
                    <div className="bk" id="lp-bk">
                      <div className="blockL" id="lp-blockL"></div>
                      <div className="block"></div>
                      <div className="lf" style={{'transform':'none','zIndex':'1'} as CSSProperties}><div className="face front" style={{'transform':'none'} as CSSProperties}><div className="page">
                        <div className="mark"></div>
                        <p style={{'textAlign':'center','fontWeight':'700'} as CSSProperties}>다음 이야기는<br />당신의 차례예요</p>
                        <div className="rule"></div>
                        <p style={{'textAlign':'center','fontSize':'2.2cqw','opacity':'.6'} as CSSProperties}>여기에 우리 반 이야기를 이어 써요</p>
                      </div></div></div>

                      <div className="lf cover" data-i="0">
                        <div className="face front"><div className="sh"></div><div className="foil">
                          <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="7"/><path d="M20 4v5M20 31v5M4 20h5M31 20h5M9 9l3.5 3.5M27.5 27.5 31 31M31 9l-3.5 3.5M12.5 27.5 9 31"/></svg>
                          <b>플립북</b><span>FLIPBOOK</span></div></div>
                        <div className="face back endpaper"><div className="sh"></div></div>
                      </div>
                      <div className="lf" data-i="1">
                        <div className="face front"><div className="sh"></div><div className="page">
                          <h3><small>1 · 읽고</small>내 서재</h3>
                          <p className="dc">비 오는 날, 우산 속에서 나는 첫 문장을 썼다. 모두가 서둘러 지나가는 길 위에서 이야기만 천천히 걸었다.</p>
                          <div className="no">1</div></div></div>
                        <div className="face back"><div className="sh"></div><div className="page">
                          <div className="mark"></div>
                          <p style={{'textAlign':'center','fontWeight':'700'} as CSSProperties}>우리 반<br />이야기책</p>
                          <div className="rule"></div>
                          <p style={{'textAlign':'center','fontSize':'2.2cqw','opacity':'.6'} as CSSProperties}>AKLABS</p>
                          <div className="no">2</div></div></div>
                      </div>
                      <div className="lf" data-i="2">
                        <div className="face front"><div className="sh"></div><div className="page">
                          <h3><small>2 · 쓰고</small>작가의 책상</h3>
                          <p>글감 · 제목 · 재료 · 본문 · 퇴고 · 발행.<br />여섯 걸음이면 글 한 편이 책이 돼요.</p>
                          <div className="rule"></div>
                          <p style={{'opacity':'.75'} as CSSProperties}>“나다운 문장을 고르는 일, 그것이 퇴고예요.”</p>
                          <div className="no">3</div></div></div>
                        <div className="face back"><div className="sh"></div><div className="page">
                          <h3><small>쓰는 순서</small>여섯 걸음</h3>
                          <p>① 글감을 고른다<br />② 제목을 붙인다<br />③ 재료를 모은다<br />④ 본문을 쓴다<br />⑤ 퇴고한다<br />⑥ 발행한다</p>
                          <div className="no">4</div></div></div>
                      </div>
                      <div className="lf" data-i="3">
                        <div className="face front"><div className="sh"></div><div className="page">
                          <h3><small>3 · 함께 엮어</small>이야기 교실</h3>
                          <p>한 사람이 한 줄, 다음 사람이 또 한 줄. 모둠의 문장이 이어져 한 권이 돼요.</p>
                          <div className="no">5</div></div></div>
                        <div className="face back"><div className="sh"></div><div className="page">
                          <div className="mark"></div>
                          <p style={{'textAlign':'center','fontWeight':'700'} as CSSProperties}>읽고, 쓰고,<br />함께 엮어</p>
                          <div className="no">6</div></div></div>
                      </div>
                      <div className="spine" id="lp-spine"></div>
                    </div>
                  </div>
                  <div className="hint" id="lp-hint">내려서 책을 펼쳐 보세요<i></i></div>
                </div>
              </div>
            </div>


            <section className="ch" id="c1">
              <div className="chin">
                <div className="tx"><div className="num">1</div><small>혼자 쓰기</small><h2>작가의 책상</h2><p>글감을 고르고, 제목을 붙이고, 쓰고, 퇴고해서 발행해요. 발행한 글은 내 서재에 책으로 꽂혀요.</p><Link className="lnk" to="/desk">책상에 앉기 <b>→</b></Link></div>
                <div className="pic p1" aria-hidden="true">
                  <div className="desk"></div>
                  <svg className="paper" viewBox="0 0 380 340">
                    <g transform="rotate(-2 190 170)">
                      <rect x="6" y="6" width="366" height="326" rx="12" fill="#FFF9EA" stroke="#4A2E22" strokeWidth="3"/>
                      <path d="M52 20v300" stroke="#E88F86" strokeWidth="2.5" strokeLinecap="round"/>
                      <path className="ink draw" pathLength="1" style={{'--a':'.04','--d':'.08','stroke':'#C8563A','strokeWidth':'5'} as CSSProperties} d="M76 52h120"/>
                      <path className="ink draw" pathLength="1" style={{'--a':'.12','--d':'.1'} as CSSProperties} d="M76 100q10-14 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"/>
                      <path className="ink draw" pathLength="1" style={{'--a':'.22','--d':'.1'} as CSSProperties} d="M76 140q10-14 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"/>
                      <path className="ink draw" pathLength="1" style={{'--a':'.32','--d':'.1'} as CSSProperties} d="M76 180q10-14 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"/>
                      <path className="ink draw" pathLength="1" style={{'--a':'.42','--d':'.1'} as CSSProperties} d="M76 220q10-14 20 0t20 0t20 0t20 0t20 0t20 0"/>
                      <path className="ink draw" pathLength="1" style={{'--a':'.52','--d':'.1','stroke':'#C8563A'} as CSSProperties} d="M76 262q10-14 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"/>
                    </g>
                  </svg>
                  <svg className="pencil" id="lp-pencil" viewBox="0 0 90 20"><g transform="translate(0 10)"><path d="M0 0l16-8v16z" fill="#F2D3A5" stroke="#4A2E22" strokeWidth="2.6" strokeLinejoin="round"/><path d="M0 0l5-2.5v5z" fill="#4A2E22"/><rect x="16" y="-8" width="52" height="16" fill="#EBA93A" stroke="#4A2E22" strokeWidth="2.6"/><rect x="68" y="-8" width="14" height="16" rx="3" fill="#E88F86" stroke="#4A2E22" strokeWidth="2.6"/></g></svg>
                  <ol className="steps">
                    <li style={{'--a':'.58','--d':'.06'} as CSSProperties}>글감</li><li style={{'--a':'.64','--d':'.06'} as CSSProperties}>제목</li><li style={{'--a':'.70','--d':'.06'} as CSSProperties}>재료</li><li style={{'--a':'.76','--d':'.06'} as CSSProperties}>본문</li><li style={{'--a':'.82','--d':'.06'} as CSSProperties}>퇴고</li><li style={{'--a':'.88','--d':'.06'} as CSSProperties}>발행</li>
                  </ol>
                </div>
              </div>
            </section>


            <section className="ch" id="c2">
              <div className="chin">
                <div className="tx"><div className="num">2</div><small>같이 쓰기</small><h2>이야기 교실</h2><p>모둠이 채팅처럼 이어 쓰며 한 이야기를 만들어요. 선생님 화면도 따로 있어요.</p><Link className="lnk" to="/together">교실 들어가기 <b>→</b></Link></div>
                <div className="pic p2" aria-hidden="true">
                  <div className="bub" style={{'--a':'.06','--d':'.12','--ty':'200px','left':'0','top':'0'} as CSSProperties}><span className="av" style={{'background':'#C8563A'} as CSSProperties}>민</span><span className="tt">비 오는 날이었어요.</span></div>
                  <div className="bub r" style={{'--a':'.22','--d':'.12','--ty':'130px','right':'0','top':'92px'} as CSSProperties}><span className="av" style={{'background':'#EBA93A'} as CSSProperties}>준</span><span className="tt">우산이 하나뿐이었는데…</span></div>
                  <div className="bub" style={{'--a':'.38','--d':'.12','--ty':'70px','left':'0','top':'184px'} as CSSProperties}><span className="av" style={{'background':'#8FB08A'} as CSSProperties}>서</span><span className="tt">그때 고양이가 나타났어요!</span></div>
                  <div className="bub r" style={{'--a':'.54','--d':'.12','--ty':'10px','right':'0','top':'276px'} as CSSProperties}><span className="av" style={{'background':'#86B7CC'} as CSSProperties}>하</span><span className="tt">그래서 우리는 함께 걸었어요.</span></div>
                  <div className="mbook" style={{'--a':'.8','--d':'.16'} as CSSProperties}>
                    <svg viewBox="0 0 150 110" width="150" className="ink"><path d="M75 28C55 14 28 14 10 22v70c18-8 45-8 65 6 20-14 47-14 65-6V22c-18-8-45-8-65 6z" fill="#C8563A"/><path d="M75 28v70" /><path d="M24 40c14-4 30-3 42 3M24 56c14-4 30-3 42 3M84 43c12-6 28-7 42-3M84 59c12-6 28-7 42-3" stroke="#FFE9B8" strokeWidth="2.5"/></svg>
                    <b>우리 반 이야기책</b>
                  </div>
                </div>
              </div>
            </section>


            <section className="ch" id="c3">
              <div className="chin">
                <div className="tx"><div className="num">3</div><small>책 만들기</small><h2>내 스튜디오</h2><p>PDF나 그림으로 책장이 넘어가는 책을 만들고, 표지를 꾸며 공유해요.</p><Link className="lnk" to={user ? "/dashboard" : "/login"}>책 만들러 가기 <b>→</b></Link></div>
                <div className="pic p3" aria-hidden="true">
                  <div className="sw"><i style={{'--a':'.05','--d':'.1','background':'#C8563A'} as CSSProperties}></i><i style={{'--a':'.12','--d':'.1','background':'#EBA93A'} as CSSProperties}></i><i style={{'--a':'.19','--d':'.1','background':'#8FB08A'} as CSSProperties}></i><i style={{'--a':'.26','--d':'.1','background':'#86B7CC'} as CSSProperties}></i></div>
                  <div className="cv">
                    <div className="paint" style={{'--a':'.1','--d':'.4'} as CSSProperties}></div>
                    <div className="ti" style={{'--a':'.55','--d':'.12'} as CSSProperties}>나의 첫 책<small>FLIPBOOK</small></div>
                    <svg className="st" style={{'--a':'.64','--d':'.1','left':'26px','top':'30px'} as CSSProperties} viewBox="0 0 44 44"><path className="ink" fill="#EBA93A" d="M22 2C24 16 28 20 42 22 28 24 24 28 22 42 20 28 16 24 2 22 16 20 20 16 22 2z"/></svg>
                    <svg className="st" style={{'--a':'.72','--d':'.1','right':'22px','bottom':'80px','width':'64px'} as CSSProperties} viewBox="0 0 44 44"><circle className="ink" fill="#FFF9EA" cx="22" cy="22" r="13"/><path className="ink" d="M22 4v5M22 35v5M4 22h5M35 22h5M10 10l3 3M31 31l3 3M34 10l-3 3M13 31l-3 3"/></svg>
                    <svg className="st" style={{'--a':'.8','--d':'.1','left':'34px','bottom':'40px','width':'46px'} as CSSProperties} viewBox="0 0 44 44"><path className="ink" fill="#E88F86" d="M22 38C6 26 4 14 12 9c5-3 9 0 10 4 1-4 5-7 10-4 8 5 6 17-10 29z"/></svg>
                  </div>
                  <svg className="brush" style={{'--a':'.1','--d':'.4'} as CSSProperties} viewBox="0 0 300 40"><g className="ink"><rect x="196" y="6" width="90" height="16" rx="4" fill="#EBA93A"/><path d="M196 6l-22 10 22 10z" fill="#FFF9EA"/><path d="M174 16h-12" stroke="#C8563A" strokeWidth="8"/></g></svg>
                  <div className="rib" style={{'--a':'.88','--d':'.1'} as CSSProperties}></div>
                </div>
              </div>
            </section>


            <section className="ch" id="c4">
              <div className="chin">
                <div className="tx"><div className="num">4</div><small>구경하기</small><h2>상상 전시관</h2><p>다른 친구들이 만든 책을 구경하고 영감을 얻어요.</p><Link className="lnk" to="/gallery">구경하러 가기 <b>→</b></Link></div>
                <div className="pic p4" aria-hidden="true">
                  <div className="tag">민지의 「비 오는 날」 ♥ 12</div>
                  <div className="shelf"></div>
                  <div className="row">
                    <i className="b" style={{'--a':'.04','--d':'.14','height':'62%','background':'#EBA93A'} as CSSProperties}></i>
                    <i className="b" style={{'--a':'.12','--d':'.14','height':'80%','background':'#FFF9EA'} as CSSProperties}></i>
                    <i className="b" style={{'--a':'.20','--d':'.14','height':'70%','background':'#8FB08A'} as CSSProperties}></i>
                    <i className="b pull" style={{'--a':'.28','--d':'.14','height':'88%','background':'#C8563A'} as CSSProperties}></i>
                    <i className="b" style={{'--a':'.36','--d':'.14','height':'66%','background':'#86B7CC'} as CSSProperties}></i>
                    <i className="b" style={{'--a':'.44','--d':'.14','height':'78%','background':'#E88F86'} as CSSProperties}></i>
                    <i className="b" style={{'--a':'.52','--d':'.14','height':'58%','background':'#FFF9EA'} as CSSProperties}></i>
                  </div>
                  <svg className="plant ink" style={{'--a':'.6','--d':'.14'} as CSSProperties} viewBox="0 0 80 110"><path d="M40 70C38 50 24 44 12 46c2 14 12 24 28 24zM40 70c2-22 16-30 28-28-2 16-12 28-28 28z" fill="#8FB08A"/><path d="M40 70V46" /><path d="M22 74h36l-5 32H27z" fill="#C8563A"/></svg>
                </div>
              </div>
            </section>

            <section className="end">
              <h2>오늘, 첫 줄을 써 볼까요?</h2>
              <p>선생님은 클래스로그AI에서 들어오면 학생 글을 바로 제출받을 수 있어요.</p>
              <Link className="lnk" to="/desk">작가의 책상 열기 <b>→</b></Link>
              <p style={{ marginTop: 24 }}>나만의 AI 작가를 키우고 싶다면?</p>
              <Link className="lnk" to="/writer">AI 작가 만나러 가기 <b>→</b></Link>
            </section>
            <footer className="aklabs-foot">
              <b>AKLABS</b>
              <nav aria-label="관련 사이트"><a href="https://classlog-ai.vercel.app/" target="_blank" rel="noopener">클래스로그AI</a><a href="https://ai-service-hub.vercel.app/" target="_blank" rel="noopener">아크의 실험실</a></nav>
            </footer>
        </div>
    )
}
