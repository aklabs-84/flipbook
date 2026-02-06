
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { supabase } from './lib/supabase'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Viewer from './pages/Viewer'
import Gallery from './pages/Gallery'
import Navbar from './components/Navbar'

// Layout component to conditionally show Navbar
function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    // Hide navbar on Editor and Viewer pages
    const hideNavbar = location.pathname.startsWith('/edit/') || location.pathname.startsWith('/view/')

    return (
        <>
            {!hideNavbar && <Navbar />}
            {children}
        </>
    )
}

function App() {
    const { setSession } = useAuthStore()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [setSession])

    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/edit/:bookId" element={<Editor />} />
                    <Route path="/view/:bookId" element={<Viewer />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    )
}

export default App
