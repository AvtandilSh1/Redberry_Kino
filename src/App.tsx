import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { AuthModal } from './components/AuthModal'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { BookingPage } from './pages/BookingPage'
import { HomePage } from './pages/HomePage'
import { MoviePage } from './pages/MoviePage'
import { ProfilePage } from './pages/ProfilePage'
import { SessionsPage } from './pages/SessionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <div className="app-shell">
        <Header />
        <AuthModal />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:sessionId/seats" element={<BookingPage />} />
          <Route path="/movies/:slug" element={<MoviePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <Footer />
      </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
