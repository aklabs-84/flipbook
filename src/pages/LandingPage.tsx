import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LandingPage() {
    const { user } = useAuthStore()

    return (
        <div className="min-h-screen bg-warm-cream font-sans text-earth-brown selection:bg-mustard-yellow selection:text-white overflow-x-hidden">
            {/* Top Decoration: Bunting */}
            <div className="absolute top-16 left-0 w-full h-16 z-10 pointer-events-none opacity-90">
                <img
                    src="/assets/bunting_decoration.png"
                    alt="Festival Bunting"
                    className="w-full h-full object-cover object-top opacity-80 mix-blend-multiply"
                />
            </div>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-center md:text-left z-20">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-grass-green/10 text-grass-green font-bold text-sm mb-6 animate-pulse">
                        🌱 나만의 상상력이 자라나는 곳
                    </span>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight text-earth-brown">
                        나만의 <br />
                        <span className="text-tomato-red relative inline-block">
                            플립북
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-mustard-yellow opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span>
                        을<br />
                        만들어보세요!
                    </h1>
                    <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto md:mx-0 leading-relaxed font-medium">
                        종이 위에서 춤추는 그림처럼, <br className="hidden sm:block" />
                        당신의 이야기를 살아있는 책으로 만들어드립니다.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Link
                            to={user ? "/dashboard" : "/login"}
                            className="px-8 py-4 bg-mustard-yellow text-white text-lg font-bold rounded-2xl shadow-[0_4px_0_rgb(217,119,6)] hover:shadow-[0_2px_0_rgb(217,119,6)] hover:translate-y-[2px] transition-all transform hover:bg-yellow-400 flex items-center justify-center gap-2 group"
                        >
                            <span>{user ? '내 프로젝트 보러가기' : '지금 시작하기'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                        <Link
                            to="/gallery"
                            className="px-8 py-4 bg-white border-2 border-earth-brown/10 text-earth-brown text-lg font-bold rounded-2xl hover:bg-gray-50 hover:border-earth-brown/30 transition-all flex items-center justify-center gap-2"
                        >
                            <span>갤러리 구경하기</span>
                        </Link>
                    </div>
                </div>

                <div className="flex-1 relative w-full max-w-xl md:max-w-none">
                    <div className="relative z-10 transform hover:scale-105 transition-transform duration-700 ease-in-out">
                        <img
                            src="/assets/hero_illustration.png"
                            alt="Book Festival Hero"
                            className="w-full h-auto drop-shadow-2xl rounded-3xl"
                        />
                    </div>
                    {/* Decorative Blobs */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-mustard-yellow/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-tomato-red/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }}></div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-4 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-carrot-orange font-bold tracking-wider uppercase text-sm mb-2 block">Features</span>
                        <h2 className="text-4xl font-black text-earth-brown mb-4">
                            디지털로 만나는 <br className="sm:hidden" /> 따뜻한 아날로그 감성
                        </h2>
                        <div className="w-24 h-1.5 bg-mustard-yellow mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative z-10">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-16 h-16 bg-warm-cream rounded-2xl flex items-center justify-center mb-6 text-3xl shadow-inner">
                                📚
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-earth-brown">손쉬운 제작</h3>
                            <p className="text-gray-500 leading-relaxed">
                                복잡한 툴 없이 클릭 몇 번으로<br />
                                나만의 책을 뚝딱 만들어보세요.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:-translate-y-2 transition-transform duration-300 md:translate-y-4">
                            <div className="w-16 h-16 bg-warm-cream rounded-2xl flex items-center justify-center mb-6 text-3xl shadow-inner">
                                🎨
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-earth-brown">다양한 커스터마이징</h3>
                            <p className="text-gray-500 leading-relaxed">
                                내 취향대로 표지부터 내지까지<br />
                                자유롭게 꾸밀 수 있어요.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-16 h-16 bg-warm-cream rounded-2xl flex items-center justify-center mb-6 text-3xl shadow-inner">
                                🔗
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-earth-brown">간편한 공유</h3>
                            <p className="text-gray-500 leading-relaxed">
                                완성된 작품은 링크 하나로<br />
                                친구들과 바로 공유하세요.
                            </p>
                        </div>
                    </div>

                    {/* Decorative Icons Background */}
                    <div className="absolute top-1/2 left-0 w-full h-64 -z-0 opacity-10 pointer-events-none transform -translate-y-1/2 overflow-hidden">
                        <img
                            src="/assets/icons_illustration.png"
                            alt="Background Icons"
                            className="w-full h-full object-cover grayscale opacity-50"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-5xl mx-auto bg-earth-brown rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-black text-warm-cream mb-8 leading-tight">
                            당신의 이야기는 <br />
                            어떤 모양인가요?
                        </h2>
                        <Link
                            to={user ? "/dashboard" : "/login"}
                            className="inline-block px-10 py-5 bg-tomato-red text-white text-xl font-bold rounded-full shadow-lg hover:bg-red-500 hover:scale-105 transition-all duration-300"
                        >
                            지금 바로 시작하기
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-earth-brown/5">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <img
                        src="/aklabs_logo.svg"
                        alt="AK Labs"
                        className="h-8 mx-auto mb-6 opacity-80"
                    />
                    <p className="text-gray-400 font-medium">© 2024 AK Labs. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
