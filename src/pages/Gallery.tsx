import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookStore } from '../store/bookStore'
// @ts-ignore
import { Database } from '../types/supabase'

type BookRow = Database['public']['Tables']['books']['Row']

export default function Gallery() {
    const { fetchPublicBooks } = useBookStore()
    const [books, setBooks] = useState<BookRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPublicBooks().then(data => {
            setBooks(data)
            setLoading(false)
        })
    }, [fetchPublicBooks])

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

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12 sm:mb-16">
                    <span className="inline-block px-3 py-1 rounded-full bg-mustard-yellow/20 text-earth-brown text-sm font-bold mb-3">
                        Museum of Imagination
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-black text-earth-brown mb-4 tracking-tight">
                        상상 전시관
                        <span className="text-tomato-red inline-block animate-bounce" style={{ animationDuration: '2s' }}>.</span>
                    </h1>
                    <p className="text-lg text-earth-brown/70 max-w-2xl mx-auto font-medium">
                        다른 작가님들은 어떤 이야기를 만들었을까요? <br className="sm:hidden" />
                        마음껏 구경해보세요!
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-12 h-12 border-4 border-mustard-yellow/30 border-t-mustard-yellow rounded-full"></div>
                    </div>
                ) : books.length === 0 ? (
                    <div className="text-center py-20 bg-warm-cream/30 rounded-[2rem] border-2 border-dashed border-earth-brown/10">
                        <div className="text-6xl mb-4 opacity-80">🎪</div>
                        <h3 className="text-xl font-bold text-earth-brown mb-2">아직 전시된 작품이 없어요</h3>
                        <p className="text-earth-brown/60">가장 먼저 나의 책을 자랑해보세요!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {books.map(book => (
                            <Link key={book.id} to={`/view/${book.id}`} className="group block">
                                <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] transition-all duration-300 transform group-hover:-translate-y-2 h-[380px] flex flex-col border border-gray-100 group-hover:border-mustard-yellow/50 relative">

                                    {/* Cover Image Area */}
                                    <div className="h-[220px] bg-warm-cream/50 relative items-center justify-center flex overflow-hidden border-b border-gray-100">
                                        <div className={`w-36 h-48 rounded-lg shadow-xl transform transition duration-500 group-hover:scale-110 group-hover:rotate-2 relative overflow-hidden ${book.password_hash ? 'bg-earth-brown' : 'bg-brand-purple'}`}
                                            style={!book.cover_url ? {
                                                background: book.password_hash
                                                    ? 'linear-gradient(135deg, #4A3228 0%, #2a1c15 100%)'
                                                    : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
                                            } : {}}
                                        >
                                            {book.cover_url ? (
                                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    {/* Book Texture */}
                                                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                                                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/10 mix-blend-overlay"></div>

                                                    {/* Title on Generic Cover */}
                                                    <div className="absolute inset-0 p-4 flex items-center justify-center text-center">
                                                        <span className="text-white/90 font-bold text-sm line-clamp-3 leading-tight font-serif italic">
                                                            {book.title}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Lock Overlay */}
                                        {book.password_hash && (
                                            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center">
                                                <div className="bg-white/90 p-3 rounded-full shadow-lg text-tomato-red animate-pulse">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${book.password_hash
                                                    ? 'bg-gray-100 text-gray-500'
                                                    : 'bg-grass-green/10 text-grass-green'
                                                    }`}>
                                                    {book.password_hash ? 'Private' : 'Public'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-earth-brown truncate leading-tight group-hover:text-carrot-orange transition-colors">
                                                {book.title}
                                            </h3>
                                        </div>

                                        <div className="flex justify-between items-end border-t border-gray-50 pt-4 mt-2">
                                            <span className="text-xs font-medium text-earth-brown/50 font-mono">
                                                {new Date(book.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-mustard-yellow text-white shadow-sm transform group-hover:scale-110 transition-transform">
                                                →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
