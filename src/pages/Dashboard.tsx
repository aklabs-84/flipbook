import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useBookStore } from '../store/bookStore'
// @ts-ignore
import { Database } from '../types/supabase'
import BookSettingsModal from '../components/BookSettingsModal'

type BookRow = Database['public']['Tables']['books']['Row']

export default function Dashboard() {
    const { user, signOut, isInitialized } = useAuthStore()
    const { fetchUserBooks, createBook } = useBookStore()
    const navigate = useNavigate()

    const [books, setBooks] = useState<BookRow[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [progress, setProgress] = useState(0)
    const pdfInputRef = useRef<HTMLInputElement>(null)

    const [settingsModalOpen, setSettingsModalOpen] = useState(false)
    const [selectedBookForSettings, setSelectedBookForSettings] = useState<BookRow | null>(null)

    useEffect(() => {
        if (!isInitialized) return

        if (!user) {
            navigate('/login')
            return
        }

        fetchUserBooks(user.id).then(data => {
            setBooks(data)
            setLoading(false)
        })
    }, [user, isInitialized, fetchUserBooks, navigate])

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const handleCreateBook = async () => {
        if (!user) return

        // Ask for title (simple prompt for now)
        const title = window.prompt("새 프로젝트 이름을 입력하세요:", "나의 멋진 플립북")
        if (!title) return

        setCreating(true)
        const newBookId = await createBook(user.id, title)
        setCreating(false)

        if (newBookId) {
            navigate(`/edit/${newBookId}`)
        }
        if (newBookId) {
            navigate(`/edit/${newBookId}`)
        }
    }

    const handlePDFInit = () => {
        if (pdfInputRef.current) pdfInputRef.current.click()
    }

    const handlePDFSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        const title = window.prompt("PDF 프로젝트 이름을 입력하세요:", file.name.replace('.pdf', ''))
        if (!title) return

        setCreating(true)
        setProgress(0)

        const newBookId = await useBookStore.getState().createBookFromPDF(user.id, title, file, (p) => setProgress(p))

        setCreating(false)
        setProgress(0)

        if (newBookId) {
            navigate(`/edit/${newBookId}`)
        } else {
            alert("PDF 변환에 실패했습니다.")
        }
    }

    const handleEditTitle = async (e: React.MouseEvent, book: BookRow) => {
        e.preventDefault()
        e.stopPropagation()

        const newTitle = window.prompt("프로젝트 이름을 변경하세요:", book.title)
        if (!newTitle || newTitle === book.title) return

        await useBookStore.getState().updateBookTitle(book.id, newTitle)

        // Update local state
        setBooks(books.map(b => b.id === book.id ? { ...b, title: newTitle } : b))
    }

    // const handleDeleteBook = async (e: React.MouseEvent, book: BookRow) => {
    //     e.preventDefault()
    //     e.stopPropagation()

    //     if (!window.confirm(`정말로 '${book.title}' 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return

    //     await useBookStore.getState().deleteBook(book.id)

    //     setBooks(books.filter(b => b.id !== book.id))
    // }

    const handleOpenSettings = (e: React.MouseEvent, book: BookRow) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedBookForSettings(book)
        setSettingsModalOpen(true)
    }

    const handleSaveSettings = async (bookId: string, settings: { isPublic: boolean, password?: string | null, coverUrl?: string | null }) => {
        await useBookStore.getState().updateBookSettings(bookId, settings)
        // Refetch or update local state
        setBooks(books.map(b => {
            if (b.id === bookId) {
                return {
                    ...b,
                    is_public: settings.isPublic,
                    password_hash: settings.password !== undefined ? settings.password : b.password_hash,
                    cover_url: settings.coverUrl !== undefined ? settings.coverUrl : b.cover_url
                }
            }
            return b
        }))
    }

    return (
        <div className="min-h-screen bg-white pt-24 sm:pt-32 pb-20 px-4 sm:px-8 font-sans text-earth-brown">
            {/* Top Decoration */}
            <div className="absolute top-16 left-0 w-full h-16 z-0 pointer-events-none opacity-50">
                <img
                    src="/assets/bunting_decoration.png"
                    alt="Festival Bunting"
                    className="w-full h-full object-cover object-top mix-blend-multiply"
                />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 w-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="inline-block w-8 h-8 rounded-full bg-carrot-orange text-white flex items-center justify-center font-bold">
                                {user?.email?.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-mustard-yellow font-bold tracking-wider text-sm uppercase">My Studio</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-earth-brown tracking-tight">
                            내 프로젝트
                        </h1>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="text-earth-brown/60 hover:text-tomato-red font-medium text-sm border-b border-transparent hover:border-tomato-red transition-all"
                    >
                        로그아웃
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-earth-brown/40 animate-pulse">
                        <span className="text-4xl block mb-2">📚</span>
                        서재를 정리하고 있어요...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* New Project Card */}
                        <div
                            onClick={handleCreateBook}
                            className={`
                            border-3 border-dashed border-mustard-yellow/40 rounded-[2rem] 
                            flex flex-col items-center justify-center h-[360px] cursor-pointer
                            bg-warm-cream/20 hover:bg-mustard-yellow/5 hover:border-mustard-yellow hover:scale-[1.02]
                            transition-all group duration-300 relative overflow-hidden
                            ${creating ? 'opacity-50 pointer-events-none' : ''}
                        `}>
                            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 group-hover:shadow-md transition-shadow">
                                <span className="text-4xl text-mustard-yellow group-hover:scale-110 transition-transform duration-300">+</span>
                            </div>
                            <h3 className="font-bold text-xl text-earth-brown mb-2">새 플립북 만들기</h3>
                            <p className="text-earth-brown/60 text-sm text-center px-6">
                                빈 페이지위에 당신의 상상력을<br />마음껏 펼쳐보세요
                            </p>
                        </div>

                        {/* PDF Import Card */}
                        <div
                            onClick={handlePDFInit}
                            className={`
                            border-3 border-dashed border-grass-green/40 rounded-[2rem] 
                            flex flex-col items-center justify-center h-[360px] cursor-pointer
                            bg-grass-green/5 hover:bg-grass-green/10 hover:border-grass-green hover:scale-[1.02]
                            transition-all group duration-300 relative overflow-hidden
                            ${creating ? 'opacity-50 pointer-events-none' : ''}
                        `}>
                            <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                ref={pdfInputRef}
                                onChange={handlePDFSelected}
                            />
                            {creating && progress > 0 ? (
                                <div className="w-full px-8 text-center">
                                    <div className="text-2xl mb-2">🔄</div>
                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-grass-green transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="mt-2 text-sm text-grass-green font-bold">{progress}% 변환 중...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 group-hover:shadow-md transition-shadow">
                                        <span className="text-3xl">📄</span>
                                    </div>
                                    <h3 className="font-bold text-xl text-earth-brown mb-2">PDF로 만들기</h3>
                                    <p className="text-earth-brown/60 text-sm text-center px-6">
                                        기존 PDF 파일을 가져와서<br />플립북으로 변환합니다
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Existing Books */}
                        {books.map(book => (
                            <div key={book.id} className="group relative bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-[360px] flex flex-col border border-gray-100 overflow-hidden">
                                <Link
                                    to={`/edit/${book.id}`}
                                    className="flex-1 bg-warm-cream/50 cursor-pointer relative flex items-center justify-center overflow-hidden"
                                >
                                    <div className="w-32 h-44 bg-earth-brown rounded-r shadow-lg transform group-hover:scale-105 group-hover:rotate-2 transition-transform duration-500 relative overflow-hidden">
                                        {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 border-l-2 border-white/10 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                                                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                                    <span className="text-white/60 text-xs font-serif italic truncate w-full">{book.title}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Private Badge */}
                                    {book.password_hash && (
                                        <div className="absolute top-4 right-4 text-earth-brown/40" title="비공개">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </Link>

                                <div className="p-5 bg-white relative z-10">
                                    <h3
                                        className="font-bold text-lg text-earth-brown truncate mb-1 cursor-pointer hover:text-carrot-orange transition-colors"
                                        onClick={(e) => handleEditTitle(e, book)}
                                        title="클릭하여 이름 변경"
                                    >
                                        {book.title}
                                    </h3>
                                    <p className="text-xs text-earth-brown/50 font-mono mb-4">
                                        {new Date(book.created_at).toLocaleDateString()}
                                    </p>

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/edit/${book.id}`}
                                            className="flex-1 py-2.5 bg-mustard-yellow text-white text-sm font-bold rounded-xl text-center shadow-[0_2px_0_#d97706] active:translate-y-[2px] active:shadow-none hover:bg-yellow-500 transition-all"
                                        >
                                            편집
                                        </Link>
                                        <button
                                            onClick={(e) => handleOpenSettings(e, book)}
                                            className="w-10 flex items-center justify-center bg-gray-100 text-earth-brown rounded-xl hover:bg-gray-200 transition-colors"
                                            title="설정"
                                        >
                                            ⚙️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Settings Modal (Placeholder for logic) */}
                {/* Settings Modal */}
                {settingsModalOpen && selectedBookForSettings && (
                    <BookSettingsModal
                        isOpen={settingsModalOpen}
                        onClose={() => {
                            setSettingsModalOpen(false)
                            setSelectedBookForSettings(null)
                        }}
                        book={selectedBookForSettings}
                        onSave={handleSaveSettings}
                    />
                )}
            </div>
        </div>
    )

}
