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
├── .env.example                    نموذج متغيرات البيئة
├── supabase/
│   └── schema.sql                  كود SQL لإنشاء الجدول وسياسات RLS والتخزين
└── src/
    ├── main.jsx                    نقطة تشغيل React + BrowserRouter
    ├── App.jsx                     تعريف المسارات (Routes)
    ├── index.css                   استيراد Tailwind + نظام الألوان والخطوط
    ├── lib/
    │   └── supabaseClient.js       إعداد اتصال Supabase
    ├── components/
    │   ├── Header.jsx              الهيدر: الشعار والتنقل
    │   ├── SearchBar.jsx           حقل البحث
    │   ├── PostCard.jsx            بطاقة المقال في الشبكة
    │   ├── VideoEmbed.jsx          مشغل فيديو يوتيوب متجاوب
    │   └── LoadingSpinner.jsx      مؤشر التحميل
    ├── pages/
    │   ├── Home.jsx                الصفحة الرئيسية (شبكة + بحث)
    │   ├── PostView.jsx            صفحة قراءة مقال واحد
    │   └── AdminPanel.jsx          نموذج نشر مقال جديد
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
   - سياسات RLS تسمح بالقراءة والكتابة العامة (لأن لوحة التحكم لا تحتوي
     تسجيل دخول — انظر ملاحظة الأمان أدناه).
   - مخزن (bucket) باسم `blog-images` بوصول عام للقراءة، مع سياسات لرفع
     الصور إليه.
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

## 3) التشغيل محلياً بـ Vite

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

## ⚠️ ملاحظة أمان مهمة

لوحة التحكم (`/admin`) **غير محمية بتسجيل دخول** — أي شخص يعرف الرابط
يستطيع نشر مقال، تماماً كما هو محدد في المتطلبات الأصلية (نموذج نشر مباشر
بدون طبقة مصادقة). هذا مناسب للتجربة المحلية أو الاستخدام الشخصي البحت،
لكن **قبل نشر الموقع للعامة**، يُنصح بشدة بإضافة حماية حقيقية، مثل:

- تفعيل [Supabase Auth](https://supabase.com/docs/guides/auth) (تسجيل دخول
  بالبريد الإلكتروني) وحماية مسار `/admin` بمكوّن يتحقق من الجلسة.
- تعديل سياسة `insert` في `posts` و `storage.objects` لتقتصر على
  `to authenticated` بدلاً من `to anon, authenticated`.

يسعدني إضافة هذه الطبقة إذا احتجتها لاحقاً.

## نشر الموقع (اختياري)

عند النشر على Vercel/Netlify أو أي استضافة ثابتة:
- أضف نفس متغيرات البيئة (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  في إعدادات المشروع على منصة الاستضافة.
- بما أن التنقل بين الصفحات يتم عبر React Router (من جهة العميل)، فعّل
  "SPA fallback" حتى يعمل تحديث الصفحة على روابط مثل `/post/123` —
  في Netlify يكون ذلك عبر ملف `public/_redirects` بمحتوى
  `/* /index.html 200`، وفي Vercel يُكتشف تلقائياً لمشاريع Vite عادةً.
