# مدونتي — مدونة شخصية (React + Tailwind CSS v4 + Supabase)

مدونة شخصية كاملة: صفحة رئيسية بشبكة مقالات وبحث، صفحة قراءة مريحة مع دعم
تضمين فيديو يوتيوب، ولوحة تحكم لنشر مقالات جديدة مع رفع صورة الغلاف (مع
ضغطها تلقائياً قبل الرفع) إلى Supabase Storage.

## البنية التقنية

- **React 19** + **Vite** — واجهة المستخدم
- **Tailwind CSS v4** (عبر `@tailwindcss/vite`، بدون ملف إعداد منفصل)
- **React Router v7** — التنقل بين الصفحات
- **Supabase** — قاعدة البيانات (`posts`) والتخزين (`blog-images`)
- تصميم **RTL** بالكامل مع خطوط عربية (Reem Kufi للشعار، El Messiri
  للعناوين وواجهة الاستخدام، Noto Naskh Arabic لنص المقال الكامل)

## هيكل الملفات

```
personal-blog/
├── index.html                      نقطة الدخول، اتجاه RTL وخطوط جوجل
├── vite.config.js                  إعداد Vite + إضافة Tailwind
├── vercel.json                     إعادة توجيه SPA (يمنع 404 عند نشر Vercel)
├── .env.example                    نموذج متغيرات البيئة
├── supabase/
│   └── schema.sql                  كود SQL لإنشاء الجدول وسياسات RLS والتخزين
└── src/
    ├── main.jsx                    نقطة تشغيل React + BrowserRouter + AuthProvider
    ├── App.jsx                     تعريف المسارات (Routes)
    ├── index.css                   استيراد Tailwind + نظام الألوان والخطوط
    ├── lib/
    │   ├── supabaseClient.js       إعداد اتصال Supabase
    │   └── AuthContext.jsx         حالة تسجيل الدخول عبر التطبيق كله
    ├── components/
    │   ├── Header.jsx              الهيدر: الشعار والتنقل
    │   ├── SearchBar.jsx           حقل البحث
    │   ├── PostCard.jsx            بطاقة المقال في الشبكة
    │   ├── VideoEmbed.jsx          مشغل فيديو يوتيوب متجاوب
    │   ├── LoadingSpinner.jsx      مؤشر التحميل
    │   └── Login.jsx               نموذج تسجيل الدخول (بلا تسجيل عام)
    ├── pages/
    │   ├── Home.jsx                الصفحة الرئيسية (شبكة + بحث)
    │   ├── PostView.jsx            صفحة قراءة مقال واحد
    │   └── AdminPanel.jsx          محمي بتسجيل الدخول + نموذج نشر مقال
    └── utils/
        ├── formatDate.js           تنسيق التاريخ بالعربية
        ├── excerpt.js              توليد مقتطف من نص المقال
        └── imageCompression.js     ضغط الصورة عبر Canvas قبل الرفع
```

## 1) إعداد مشروع Supabase

1. أنشئ مشروعاً جديداً على [supabase.com](https://supabase.com) (مجاني).
2. من القائمة الجانبية، افتح **SQL Editor** → **New query**، الصق محتوى
   الملف `supabase/schema.sql` بالكامل، ثم اضغط **Run**.
   هذا الملف ينشئ:
   - جدول `posts` بالأعمدة: `id`, `title`, `content`, `image_url`,
     `video_url`, `created_at`.
   - سياسات RLS: القراءة متاحة للجميع، أما النشر (`insert`) فمقتصر على
     مستخدم مسجّل دخوله فقط — التفاصيل في القسم 3 أدناه.
   - مخزن (bucket) باسم `blog-images` بوصول عام للقراءة، والرفع فيه مقتصر
     أيضاً على المستخدم المسجّل دخوله.
3. من **Project Settings → Data API**، انسخ **Project URL**.
   من **Project Settings → API Keys**، انسخ مفتاح **anon public**.

## 2) إعداد متغيرات البيئة

```bash
cp .env.example .env
```

ثم افتح `.env` وضع القيم التي نسختها:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 3) حماية لوحة التحكم (تسجيل الدخول)

مسار `/admin` محمي الآن بتسجيل دخول عبر Supabase Auth، ولا يوجد نموذج
تسجيل عام (Sign Up) — عمداً، حتى لا يقدر أي زائر إنشاء حساب لنفسه. الحساب
الوحيد المسموح به هو حسابك أنت، ويُنشأ يدوياً من لوحة Supabase:

1. من لوحة Supabase: **Authentication → Users → Add user**.
2. أدخل بريدك الإلكتروني وكلمة مرور، وفعّل خيار **Auto Confirm User** حتى
   يصبح الحساب جاهزاً للدخول فوراً بدون تأكيد بريد.
3. من **Authentication → Sign In / Providers** (أو **Settings** حسب واجهة
   لوحتك)، عطّل **Allow new users to sign up**. هذه الخطوة **ضرورية أمنياً**:
   بدونها، أي شخص يقدر يستدعي `auth.signUp()` مباشرة عبر واجهة Supabase
   ويصبح "authenticated" بنفسه، متجاوزاً تسجيل الدخول في الواجهة تماماً.
4. تأكد أنك نفّذت أحدث نسخة من `supabase/schema.sql` — سياسة النشر أصبحت
   الآن مقتصرة على `to authenticated` بدلاً من `to anon, authenticated`.

بعد هذا: رابط `/admin` لا يظهر في القائمة العلوية إلا لمن سجّل دخوله، وأي
زائر آخر يفتح `/admin` مباشرة سيرى نموذج تسجيل دخول فقط، بلا أي قدرة على
النشر حتى لو حاول استدعاء الـ API مباشرة (الحماية الفعلية في RLS على
قاعدة البيانات، وليس فقط في إخفاء الرابط بالواجهة).

## 4) التشغيل بـ Vite

يتطلب [Node.js](https://nodejs.org) إصدار 18 أو أحدث.

```bash
npm install       # تثبيت الحزم
npm run dev       # تشغيل خادم التطوير (عادة على http://localhost:5173)
```

للبناء والمعاينة كنسخة إنتاج:

```bash
npm run build      # يُنشئ مجلد dist/ جاهزاً للنشر
npm run preview    # معاينة نسخة الإنتاج محلياً
```

## نشر الموقع (اختياري)

عند النشر على Vercel/Netlify أو أي استضافة ثابتة:
- أضف نفس متغيرات البيئة (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  في إعدادات المشروع على منصة الاستضافة.
- بما أن التنقل بين الصفحات يتم عبر React Router (من جهة العميل)، **يجب**
  تفعيل "SPA fallback" وإلا ستحصل على `404 NOT_FOUND` عند فتح رابط مباشر
  مثل `/post/123` من جهاز آخر أو عند تحديث الصفحة (وهذا غير مُكتشف تلقائياً
  دائماً، خلافاً لما ذكرته سابقاً):
  - **Vercel**: ملف `vercel.json` في جذر المشروع (مرفق في المشروع) بمحتوى:
    ```json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    ```
  - **Netlify**: ملف `public/_redirects` بمحتوى `/* /index.html 200`.
