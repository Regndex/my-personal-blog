import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import AdminLayout from './components/AdminLayout'
import Home from './pages/Home'
import PostView from './pages/PostView'
import Archive from './pages/Archive'
import NewPost from './pages/admin/NewPost'
import ManagePosts from './pages/admin/ManagePosts'
import EditPost from './pages/admin/EditPost'
import ModerateComments from './pages/admin/ModerateComments'
import Stats from './pages/admin/Stats'

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main>
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
