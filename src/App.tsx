import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { AuthModal } from './components/AuthModal'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <div className="app-shell">
        <Header />
        <AuthModal />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/sessions"
            element={
              <PlaceholderPage
                title="Sessions"
                body="Filters, search, and sorting for showtimes come in the next step."
              />
            }
          />
          <Route
            path="/movies/:slug"
            element={
              <PlaceholderPage
                title="Film details"
                body="The film page, with showtimes, is the section after this home page."
              />
            }
          />
          <Route
            path="/profile"
            element={
              <PlaceholderPage
                title="My Profile"
                body="Personal details and your tickets are the profile section, which comes after the booking flow."
              />
            }
          />
        </Routes>
      </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
