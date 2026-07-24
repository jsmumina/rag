# Joylashtirish yo'riqnomasi (Deploy) — o'zbekcha

Bu sayt **2 qismdan** iborat va **ikkalasi ham internetda ishlashi kerak**:

| Qism | Nima | Qayerda ishlaydi (bepul) |
|---|---|---|
| **Backend** (`backend/`) | Python/FastAPI + AI agent | **Render.com** |
| **Frontend** (`frontend/`) | Next.js chat oynasi | **Vercel** |

> ⚠️ **404 xatosining sababi shu edi:** GitHub Pages faqat statik sayt beradi, Python
> backend'ni ishlata olmaydi. Backend hech qayerda ishlamagani uchun `/chat` → 404.
> Backend'ni Render'ga qo'ysangiz — 404 yo'qoladi.

> ℹ️ **Nega Render (Hugging Face emas)?** Hugging Face endi Docker Space'larni bepul
> ishlatish uchun pullik **PRO** obuna talab qiladi. Render esa Docker'ni bepul,
> kartasiz va to'g'ridan-to'g'ri GitHub repongizdan ishga tushiradi.

Jami ~15 daqiqa. Bank kartasi **kerak emas** — hammasi bepul.

---

## 1-qadam — Bepul AI kalit olish (Google Gemini)

1. Brauzerda oching: <https://aistudio.google.com/apikey>
2. Google akkauntingiz bilan kiring.
3. **"Create API key"** → **"Create API key in new project"**.
4. Chiqqan kalitni (`AIza...` bilan boshlanadi) **nusxalab, saqlab qo'ying.**

> Bu kalit AI'ning "miyasi"ga ulanish uchun. Uni kodga yozmang — pastda Render'ning
> maxfiy (secret) maydoniga qo'yasiz.

---

## 2-qadam — Backend'ni Render.com'ga qo'yish

Kod GitHub'da tayyor (`render.yaml` blueprint bor), shuning uchun bu deyarli avtomat.

1. <https://dashboard.render.com> — oching va **"Sign in with GitHub"** bilan kiring
   (bepul, karta so'ramaydi).
2. Yuqori o'ngdan **New +** → **Blueprint**.
3. GitHub repongizni tanlang: **`jsmumina/rag`** → **Connect**.
   - (Agar repo ko'rinmasa: **Configure account** → Render'ga repoga ruxsat bering.)
4. Render `render.yaml` ni o'qib, **`rag-backend`** xizmatini ko'rsatadi.
   Pastda **`GOOGLE_API_KEY`** maydonini so'raydi → 1-qadamdagi Gemini kalitni
   o'sha yerga qo'ying. (`TAVILY_API_KEY` ni bo'sh qoldiring — ixtiyoriy.)
5. **Apply** (yoki **Create**) bosing. Render Docker image'ini quradi — birinchi
   marta **3-6 daqiqa** ketishi mumkin. **"Live"** (yashil) bo'lguncha kuting.

### Backend ishlаyaptimi — tekshirish
Render bergan manzil shунга o'xshaydi: `https://rag-backend.onrender.com`
(aniq manzil Render sahifasида yuqorида yozilgan). Uning oxiriga `/health` qo'shib oching:

```
https://rag-backend.onrender.com/health
```

Shунга o'xshash javob chiqsa — backend tayyor ✅:
```json
{"status":"ok","provider":"google","chat_model":"gemini-2.0-flash", ...}
```

> **Frontend'siz sinash:** manzil oxiriga `/docs` qo'shib oching — u yerdan
> `POST /chat` ni bosib, `{"question": "hi"}` yuborib, AI salomlashishini ko'rasiz.

> ⚠️ **Render bepul tarifi haqида:** xizmat 15 daqiqa ishlatilmasa "uxlaydi",
> keyingi so'rovда ~1 daqiqa uyg'onadi (birinchi javob sekin bo'ladi — bu normal).

**Bu `https://rag-backend.onrender.com` manzilini eslab qoling** — keyingi qadamда kerak.

---

## 3-qadam — Frontend'ni Vercel'ga qo'yish va backend'ga ulash

1. <https://vercel.com/signup> — GitHub akkauntingiz bilan kiring.
2. **Add New → Project** → `jsmumina/rag` repozitoriyani **Import** qiling.
3. **Muhim sozlamalar:**
   - **Root Directory:** `frontend` ni tanlang (butun repo emas!).
   - **Environment Variables** ga qo'shing:
     - **Name:** `NEXT_PUBLIC_API_URL`
     - **Value:** 2-qadamdagi backend manzili, masalan
       `https://rag-backend.onrender.com` (oxirида `/` **qo'ymang**).
4. **Deploy** bosing. 1-2 daqiqада sayt tayyor.

> Agar allaqачон Vercel'ga qo'ygan bo'lsangiz: **Settings → Environment Variables**
> ga `NEXT_PUBLIC_API_URL` ni qo'shing/tuzating, so'ng **Deployments → ⋯ → Redeploy**
> (env o'zgarishi faqat qayta deploy'дан keyin kuchга kiradi).

---

## 4-qadam — Sinash 🎉

1. Vercel bergan sayt manzilини oching.
2. Pastдаги maydonga **`hi`** deб yozing → AI do'stona salom qaytarishi kerak.
3. Istalgan savolни yozing — AI javob beradi.
4. Hujjat bo'yicha savol-javob uchun: **Upload a document** orqali PDF/txt yuklang,
   keyin o'sha hujjat haqида so'rang — agent hujjatдан aniq javob beradi.

---

## Nima o'zgardi (bu tuzatishда)

- **`hi` va har qanday xabarга javob:** avval agent faqat yuklangan hujjatдан
  javob berardi, hujjat bo'lmasa "bilmayman" derди. Endi mos hujjat topilmasa,
  u oddiy AI suhbatdosh bo'lib javob beradi (`backend/app/nodes.py` → `generate`).
- **Backend root `/`:** endi backend'ning asosiy manzилини ochsangiz 404 emas,
  foydali ma'lumot chiqadi (`backend/app/main.py`).
- **Frontend xato xabari:** 404 va "ulanmadi" holatlari endi aniq ko'rsatiladi
  (`frontend/app/page.tsx`).
- **`render.yaml` + Dockerfile:** backend Render'да bir tugma bilan (blueprint)
  bepul ishga tushadigan qilib sozlandi; port endi `$PORT` orqali moslashadi.

## Tez-tez uchraydigan muammolar

| Muammo | Yechim |
|---|---|
| `/chat` hali ham 404 | Vercel'да `NEXT_PUBLIC_API_URL` backend manzилига to'g'ri ulanganини va **qayta deploy** qilganingизни tekshiring. |
| Sayt "Couldn't reach the backend" deydi | Render xizmati "Live" emas yoki uxлаган (birinchi so'rov sekin). Render sahифасida **Logs** ni ko'ring; `GOOGLE_API_KEY` qo'yilганини tekshiring. |
| Render build "failed" | Ko'pincha `GOOGLE_API_KEY` yo'q yoki xato. Render → xizmat → **Environment** → kalitни tekshiring, so'ng **Manual Deploy**. |
| Birinchi javob juda sekin | Bepul tarif 15 daqiqадан keyin uxлaydi, uyg'onishi ~1 daqiqа — normal holat. |
| Hujjatlar restart'дан keyin yo'qoladi | Bepul disk vaqtинча. Doimiy saqlash uchun bepul **Qdrant Cloud** ochib, `QDRANT_URL`/`QDRANT_API_KEY` ni Render env'ga qo'shing. |
