import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import PostForm from '../../components/PostForm'

export default function NewPost() {
  const navigate = useNavigate()
  const [redirecting, setRedirecting] = useState(false)

  async function handleCreate(data) {
    const { error } = await supabase.from('posts').insert(data)
    if (error) throw error

    setRedirecting(true)
    setTimeout(() => navigate('/admin/posts'), 1000)
  }

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-medium text-ink sm:text-3xl">
        إضافة مقال جديد
      </h1>
      <p className="mb-8 text-stone-500">
        {redirecting ? 'جارٍ التوجيه إلى إدارة المقالات...' : 'شارك أفكارك مع القراء بخطوات بسيطة'}
      </p>
      <PostForm onSubmit={handleCreate} submitLabel="نشر المقال" />
    </div>
  )
}
