import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/together.css'
import Footer from '../components/together/Footer'
import { useAuthStore } from '../store/authStore'
import { amTeacher, registerTeacher } from '../lib/relay'

export default function Profile() {
  const { user, signOut, isInitialized } = useAuthStore()
  const [teacher, setTeacher] = useState<boolean | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    if (!user) return
    amTeacher().then(setTeacher).catch(() => setTeacher(false))
  }, [user])

  async function register() {
    setBusy(true); setErr(''); setOk('')
    try {
      await registerTeacher(code)
      setTeacher(true); setCode(''); setOk('선생님으로 등록했어요! 이제 선생님 화면이 코드 없이 열려요.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '잠시 후 다시 해 보세요')
    } finally { setBusy(false) }
  }

  const how = user?.app_metadata?.provider === 'kakao' ? '카카오' : user?.app_metadata?.provider === 'google' ? '구글' : (user?.app_metadata?.provider ?? '-')

  if (!isInitialized) return <div className="tg"><div className="wrap"><p className="sub">불러오는 중…</p></div><Footer /></div>

  return (
    <div className="tg">
      <div className="wrap">
        <h1>🙋 내 정보</h1>
        {!user ? (
          <div className="card">
            <p>로그인하면 내 정보를 볼 수 있어요.</p>
            <div className="row"><Link className="btn" to="/login">로그인</Link></div>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <b>로그인한 계정</b>
              <p style={{ margin: '8px 0 0' }}>{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}</p>
              <p className="sub" style={{ margin: '2px 0 0' }}>{user.email} · {how} 로그인</p>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <b>선생님 등록</b>
              {teacher ? (
                <p style={{ margin: '8px 0 0' }}>✅ 선생님으로 등록됨. <Link to="/together">함께 쓰는 방</Link>의 선생님 화면이 코드 없이 열려요.</p>
              ) : (
                <form onSubmit={e => { e.preventDefault(); void register() }}>
                  <p className="sub" style={{ margin: '4px 0 0' }}>선생님 코드를 한 번만 넣으면, 이 계정은 다음부터 코드 없이 선생님 화면에 들어가요.</p>
                  <label className="fld" htmlFor="pf-tc">선생님 코드</label>
                  <input id="pf-tc" type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} />
                  {err && <div className="err" role="alert">{err}</div>}
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn" type="submit" disabled={busy || !code}>{busy ? '확인 중…' : '선생님으로 등록'}</button>
                  </div>
                </form>
              )}
              {ok && <div className="cmsg good" style={{ marginTop: 8 }}>{ok}</div>}
            </div>

            <div className="row">
              <button className="btn ghost" type="button" onClick={() => void signOut()}>로그아웃</button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
