import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
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
        </Routes>
      </div>
    </BrowserRouter>
  )
}
