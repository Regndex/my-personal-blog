import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import PostForm from '../../components/PostForm'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!isMounted) return

      if (error || !data) {
        setNotFound(true)
      } else {
        setPost(data)
      }
      setLoading(false)
    }

    loadPost()
    return () => {
      isMounted = false
    }
  }, [id])

  async function handleUpdate(data) {
    const { error } = await supabase.from('posts').update(data).eq('id', id)
    if (error) throw error

    setRedirecting(true)
    setTimeout(() => navigate('/admin/posts'), 1000)
  }

  if (loading) {
    return <LoadingSpinner label="جارٍ تحميل المقال..." />
  }

  if (notFound) {
    return (
      <div>
        <p className="mb-4 text-stone-500">لم يتم العثور على هذا المقال.</p>
        <Link to="/admin/posts" className="font-medium text-pine-600 hover:underline">
          العودة لإدارة المقالات
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-medium text-ink sm:text-3xl">
        تعديل المقال
      </h1>
      <p className="mb-8 text-stone-500">
        {redirecting ? 'جارٍ التوجيه إلى إدارة المقالات...' : 'عدّل أي حقل ثم احفظ التغييرات'}
      </p>
      <PostForm initialData={post} onSubmit={handleUpdate} submitLabel="حفظ التغييرات" />
    </div>
  )
}
