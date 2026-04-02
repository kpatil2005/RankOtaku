import axios from "axios"
import { useEffect, useState } from "react"
import { Homepage } from "./pages/home/Homepage"
import { AnimeDetails } from "./components/animedetails/AnimeDetails"
import { Routes, Route, useLocation } from "react-router-dom"
import { Anime } from "./pages/home/Anime"
import { QuizPage } from "./pages/quiz/QuizPage"
import AuthPage from "./pages/auth/AuthPage"
import AuthCallback from "./pages/auth/AuthCallback"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"
import ProfilePage from "./pages/profile/ProfilePage"
import { AuthProvider } from "./contexts/AuthContext"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { Achievement } from "./components/achivement/Achievement"
import { QueryProvider } from "./providers/QueryProvider"
import { CharacterSelection } from "./components/characterselection/CharacterSelection"
import { CharacterQuiz } from "./components/characterquiz/CharacterQuiz"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { NotFound } from "./pages/error/NotFound"
import { NetworkError } from "./pages/error/NetworkError"

function App() {
  const location = useLocation();
  const [anime, setAnime] = useState([])
  const [networkError, setNetworkError] = useState(false)

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/home`)
      .then(res => {
        setAnime(res.data.data)
        setNetworkError(false)
      })
      .catch(err => {
        console.error("Error fetching anime:", err)
        // Only show network error if there's truly no response (network down)
        if (!err.response) {
          setNetworkError(true)
        }
        // For rate limits or other errors, just use empty data
      })
  }, [])

  if (networkError) {
    return <NetworkError />
  }



  
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Homepage anime={anime} />} />
            <Route path="/anime" element={<Anime anime={anime}/>} />
            <Route path="/achievements" element={<Achievement />} />
            <Route path="/character-selection" element={<CharacterSelection />} />
            <Route path="/character-quiz" element={
              <ProtectedRoute>
                <CharacterQuiz />
              </ProtectedRoute>
            } />
            <Route path="/quiz" element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/anime/:slug" element={<AnimeDetails />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App