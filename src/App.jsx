import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
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
