import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { generateUniqueSlug } from '../../utils/slug'
import PostForm from '../../components/PostForm'
import RevisionHistory from '../../components/RevisionHistory'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  // Bumped whenever a revision is restored, forcing PostForm to remount
  // with the restored values as its fresh initialData.
  const [formKey, setFormKey] = useState(0)

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
    // Snapshot the post's current (pre-update) state before overwriting it,
    // so it can be restored later from the revision history below.
    await supabase.from('post_revisions').insert({
      post_id: id,
      title: post.title,
      content: post.content,
      image_url: post.image_url,
      video_url: post.video_url,
      tags: post.tags,
    })

    // The slug is generated once and then kept stable even if the title
    // changes later, so already-shared links keep working. Only generate
    // one now if this post somehow doesn't have one yet.
    const slug = post.slug || (await generateUniqueSlug(data.title, id))

    const { error } = await supabase.from('posts').update({ ...data, slug }).eq('id', id)
    if (error) throw error

    setRedirecting(true)
    setTimeout(() => navigate('/admin/posts'), 1000)
  }

  function handleRestoreRevision(revision) {
    if (!window.confirm('استعادة هذه النسخة إلى النموذج؟ لن يُحفظ شيء حتى تضغط "حفظ التغييرات".')) {
      return
    }
    setPost((prev) => ({
      ...prev,
      title: revision.title,
      content: revision.content,
      image_url: revision.image_url,
      video_url: revision.video_url,
      tags: revision.tags || [],
    }))
    setFormKey((prev) => prev + 1)
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

      <RevisionHistory postId={id} onRestore={handleRestoreRevision} />

      <PostForm
        key={formKey}
        initialData={post}
        onSubmit={handleUpdate}
        submitLabel="حفظ التغييرات"
      />
    </div>
  )
}
