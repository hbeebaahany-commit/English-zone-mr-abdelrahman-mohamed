# English Zone

واجهة منصة English Zone التعليمية، مبنية بـ React + Vite ومهيأة لمسارات الانضمام وتسجيل الدخول والتسجيل.

## التشغيل

```bash
npm install
npm run dev
```

## Supabase

انسخ `.env.example` إلى `.env` وأضف `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY`.
الواجهة لا تستخدم مصادقة وهمية أو بيانات محلية. قبل تشغيل المصادقة الفعلية يجب إنشاء جداول Supabase وRLS وسياسات التحقق الخاصة بالمعلمين والطلاب، ثم وصل عمليات access-code عبر backend محمي. لا تضع service-role key في الواجهة.

## البناء والنشر

```bash
npm run build
```

يتضمن `vercel.json` إعادة توجيه لمسارات SPA. أضف متغيرات Supabase إلى بيئات Development وPreview وProduction في إعدادات مشروع Vercel.
