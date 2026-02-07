import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function LoginPage() {
    const { signInWithGoogle, signInWithKakao, user } = useAuthStore()
    const navigate = useNavigate()

    useEffect(() => {
        if (user) {
            navigate('/dashboard')
        }
    }, [user, navigate])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
                <h2 className="text-3xl font-bold mb-2 text-brand-purple">환영합니다!</h2>
                <p className="text-gray-500 mb-8">Flipbook Pro를 시작하려면 로그인해주세요.</p>

                <div className="space-y-4">
                    <button
                        onClick={() => signInWithGoogle()}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                        Google 계정으로 계속하기
                    </button>
                    <button
                        onClick={() => signInWithKakao()}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#FEE500] rounded-xl hover:bg-[#FDD835] transition font-medium text-black/90"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3C5.925 3 1 6.925 1 11.775C1 15.525 3.45 18.75 7.125 20.1C7.125 20.1 6.375 22.8 6.15 23.4C6.15 23.4 6 23.775 6.6 23.625C10.05 21.375 12.3 19.5 12.3 19.5C12.45 19.5 12.6 19.5 12.75 19.5C18.825 19.5 23.75 15.6 23.75 10.725C23.75 5.85 18.825 3 12 3Z" fill="#3C1E1E" />
                        </svg>
                        카카오 계정으로 계속하기
                    </button>
                </div>

                <p className="mt-8 text-xs text-gray-400">
                    로그인 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
                </p>
            </div>
        </div>
    )
}
