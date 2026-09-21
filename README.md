# saeedintex.ir CMS v2

Functional test build for the reference site.

Implemented in this build:
- Multi-page public site
- Separate role from saeedintex.com
- Admin login
- Editable logo, hero banner and store link
- Automatic browser-side image resize/compression to WebP before upload
- Article editor with video field
- SEO modes: Auto / Manual / AI-ready
- Drag & drop homepage block ordering
- Custom HTML block
- User Q&A with moderation and official-answer badge
- Version snapshot before saves
- Full JSON export
- AI endpoint kept isolated for later provider connection

Render settings:
- Runtime: Node
- Start: npm start
- Health check: /
- Set ADMIN_PASSWORD and SESSION_SECRET environment variables.

Before final production launch, replace demo file persistence with PostgreSQL + durable object storage. The site modules are separated so the UI/content model does not need to be rebuilt for that migration.


## فعال‌سازی هوش مصنوعی
در Render > Environment این متغیرها را اضافه کنید:
- `OPENAI_API_KEY` = کلید پروژه OpenAI API
- `OPENAI_MODEL` = `gpt-5.6-luna` (اختیاری؛ پیش‌فرض همین است)

کلید API فقط در سرور خوانده می‌شود و هرگز در HTML/JavaScript سمت مرورگر قرار نمی‌گیرد.
قابلیت‌های AI:
- نوشتن مقاله کامل از روی موضوع
- ساخت چکیده
- بهینه‌سازی ساختار مقاله، بولد هوشمند و لینک داخلی
- پیشنهاد SEO Title / Meta Description / Slug
- پیش‌نمایش و تأیید مدیر قبل از اعمال
