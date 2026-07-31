import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import LoadingSpinner from './components/LoadingSpinner'
import Home from './pages/Home'
import PostView from './pages/PostView'

// Everything admin-only (the editor, image library, revision history,
// export/import, etc.) is irrelevant to a regular visitor reading the
// blog, so it's split into its own chunk that only loads once someone
// actually navigates to /admin — public visitors never download it.
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const NewPost = lazy(() => import('./pages/admin/NewPost'))
const ManagePosts = lazy(() => import('./pages/admin/ManagePosts'))
const EditPost = lazy(() => import('./pages/admin/EditPost'))
const ModerateComments = lazy(() => import('./pages/admin/ModerateComments'))
const Stats = lazy(() => import('./pages/admin/Stats'))
const BackupTools = lazy(() => import('./pages/admin/BackupTools'))
const Archive = lazy(() => import('./pages/Archive'))
const NotFound = lazy(() => import('./components/NotFound'))

// PixiJS + the whole simulation engine is a decorative extra, not core
// reading functionality — lazy so it never delays first paint/interactive
// for someone who just wants to read, and excluded from /admin entirely
// (see below) so it never even loads while writing/managing posts.
const LivingWorld = lazy(() => import('./components/LivingWorld'))

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="relative isolate min-h-screen bg-paper">
      {/* Absolutely positioned to this wrapper, which spans the full
          document height in normal flow — the world's canvas scrolls
          with the page and its coordinates line up with real content
          geography, rather than a viewport-fixed "camera" needing its
          own scroll-offset math. Negative z-index keeps it behind every
          normal-flow element below without those elements needing any
          z-index of their own. */}
      {!isAdmin && (
        <Suspense fallback={null}>
          <LivingWorld />
        </Suspense>
      )}
      <Header />
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<PostView />} />
            <Route path="/archive" element={<Archive />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<NewPost />} />
              <Route path="posts" element={<ManagePosts />} />
              <Route path="posts/:id/edit" element={<EditPost />} />
              <Route path="comments" element={<ModerateComments />} />
              <Route path="stats" element={<Stats />} />
              <Route path="backup" element={<BackupTools />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
