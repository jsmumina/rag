# Joylashtirish yo'riqnomasi (Deploy) — o'zbekcha

Bu sayt **2 qismdan** iborat va **ikkalasi ham internetda ishlashi kerak**:

| Qism | Nima | Qayerda ishlaydi |
|---|---|---|
| **Backend** (`backend/`) | Python/FastAPI + AI agent | Hugging Face Spaces (bepul) |
| **Frontend** (`frontend/`) | Next.js chat oynasi | Vercel (bepul) |

> ⚠️ **404 xatosining sababi shu edi:** GitHub Pages faqat statik sayt beradi, Python
> backend'ni ishlata olmaydi. Backend hech qayerda ishlamagani uchun `/chat` → 404.
> Quyidagi qadamlarni bajarib, backend'ni Hugging Face'ga qo'ysangiz — 404 yo'qoladi.

Jami ~15-20 daqiqa. Karta (bank kartasi) **kerak emas** — hammasi bepul.

---

## 1-qadam — Bepul AI kalit olish (Google Gemini)

1. Brauzerda oching: <https://aistudio.google.com/apikey>
2. Google akkauntingiz bilan kiring.
3. **"Create API key"** tugmasini bosing.
4. Chiqqan kalitni (`AIza...` bilan boshlanadi) **nusxalab, biror joyga saqlab qo'ying.**

> Bu kalit AI'ning "miyasi"ga ulanish uchun. Uni **hech kimga ko'rsatmang** va
> kodga yozmang — pastda uni maxfiy (secret) sifatida qo'yamiz.

---

## 2-qadam — Backend'ni Hugging Face Spaces'ga qo'yish

### 2.1. Space yaratish
1. <https://huggingface.co/join> — akkaunt oching (bepul).
2. <https://huggingface.co/new-space> — yangi Space yarating:
   - **Space name:** masalan `agentic-rag`
   - **License:** ixtiyoriy (masalan `mit`)
   - **Select the SDK:** **Docker** ni tanlang (muhim!) → **Blank** shablon.
   - **Space hardware:** `CPU basic` (bepul).
   - **Create Space** bosing.

### 2.2. `backend/` papkasining ICHINI Space'ga yuklash

Space ochilgach, u sizga git manzilини beradi (masalan
`https://huggingface.co/spaces/SIZNING_ISMINGIZ/agentic-rag`).

**Terminal orqali (tavsiya):**

```bash
# loyiha papkangizdagi backend'ga kiring
cd backend

# Space repozitoriyasini nusxa ko'chirib olish uchun (ALOHIDA papkaga):
cd ..
git clone https://huggingface.co/spaces/SIZNING_ISMINGIZ/agentic-rag hf-space

# backend ichidagi hamma narsani Space papkasiga ko'chiring:
#   Dockerfile, requirements.txt, README.md, app/  (papkasi bilan)
# (Windows PowerShell'da):
Copy-Item -Recurse -Force backend/* hf-space/

cd hf-space
git add .
git commit -m "Add Adaptive Agentic RAG backend"
git push
```

> Space repo'sining **ildizida** (root) shu fayllar bo'lishi shart:
> `Dockerfile`, `requirements.txt`, `README.md`, va `app/` papkasi.
> Bular aynan `backend/` ичida turibdi.

> **Eslatma:** git push paytida HF login/parol so'raydi. Parol o'rniga
> <https://huggingface.co/settings/tokens> dan **Access Token** (write huquqli)
> yarating va o'shani ishlating.

**Yoki — web orqali (terminalsiz):** Space sahifasidagi **Files → Add file →
Upload files** orqali `Dockerfile`, `requirements.txt`, `README.md` fayllarini va
`app/` papkasidagi barcha `.py` fayllarni yuklang (`app/` papkasini saqlab).

### 2.3. Maxfiy kalitni qo'yish (eng muhim qadam!)
1. Space sahifasida yuqoridagi **Settings** ni oching.
2. **Variables and secrets** bo'limiga tushing.
3. **New secret** bosing:
   - **Name:** `GOOGLE_API_KEY`
   - **Value:** 1-qadamda olgan kalitingiz (`AIza...`)
   - Saqlang.
4. (Ixtiyoriy) Internetdan qidirish uchun `TAVILY_API_KEY` ni ham shu tarzda
   qo'shsangiz bo'ladi (<https://tavily.com> dan bepul olinadi). Shart emas.

Kalit qo'yilgach, Space o'zini qayta quradi (build). Yuqorida **"Running"**
(yashil) yozuvi chiqguncha 2-4 daqiqa kuting.

### 2.4. Backend ishlаyaptimi — tekshirish
Brauzerda oching (o'z manzilingiz bilan):

```
https://SIZNING_ISMINGIZ-agentic-rag.hf.space/health
```

Agar shунга o'xshash javob chiqsa — backend tayyor ✅:
```json
{"status":"ok","provider":"google","chat_model":"gemini-2.0-flash", ...}
```

> **Backend'ni frontend'siz sinab ko'rish:** `.../docs` manzilini oching (masalan
> `https://...hf.space/docs`) — bu yerdan `POST /chat` ni bosib, `{"question": "hi"}`
> yuborib, AI salomlashishini o'z ko'zingiz bilan ko'rasiz.

**Bu `https://SIZNING_ISMINGIZ-agentic-rag.hf.space` manzilini eslab qoling** —
keyingi qadamда kerak bo'ladi.

---

## 3-qadam — Frontend'ni Vercel'ga qo'yish va backend'ga ulash

> Frontend Next.js'da yozilgan, shuning uchun **Vercel** eng mos (GitHub Pages
> Next.js'ni to'liq ishlata olmaydi).

1. <https://vercel.com/signup> — GitHub akkauntingiz bilan kiring.
2. **Add New → Project** → GitHub'dagi shu repozitoriyani tanlang (**Import**).
3. **Muhim sozlamalar:**
   - **Root Directory:** `frontend` ni tanlang (butun repo emas!).
   - **Environment Variables** bo'limida qo'shing:
     - **Name:** `NEXT_PUBLIC_API_URL`
     - **Value:** 2-qadamdagi backend manzili, masalan
       `https://SIZNING_ISMINGIZ-agentic-rag.hf.space`
       (oxirida `/` **qo'ymang**).
4. **Deploy** bosing. 1-2 daqiqada sayt tayyor bo'ladi.

> Agar frontend'ni allaqachon Vercel'ga qo'ygan bo'lsangiz: **Settings →
> Environment Variables** ga `NEXT_PUBLIC_API_URL` ni qo'shing/tuzating, so'ng
> **Deployments → ... → Redeploy** bosing (env o'zgarishi faqat qayta deploy'дан
> keyin kuchga kiradi).

---

## 4-qadam — Sinash 🎉

1. Vercel bergan sayt manzilini oching.
2. Pastdagi maydonga **`hi`** deb yozing → AI do'stona salom qaytarishi kerak.
3. Istalgan savolни yozing — AI javob beradi.
4. Hujjat bo'yicha savol-javob uchun: **Upload a document** orqali PDF/txt yuklang,
   keyin o'sha hujjat haqida so'rang — agent hujjatdan aniq javob beradi.

---

## Nima o'zgardi (bu tuzatishда)

- **`hi` va har qanday xabarga javob:** avval agent faqat yuklangan hujjatdan
  javob berardi, hujjat bo'lmasa "bilmayman" derди. Endi mos hujjat topilmasa,
  u oddiy AI suhbatdosh bo'lib javob beradi (`backend/app/nodes.py` → `generate`).
- **Backend root `/`:** endi backend'ning asosiy manzilini ochsangiz 404 emas,
  foydali ma'lumot chiqadi (`backend/app/main.py`).
- **Frontend xato xabari:** 404 va "ulanmadi" holatlari endi aniq, tushunarli
  ko'rsatiladi (`frontend/app/page.tsx`).

## Tez-tez uchraydigan muammolar

| Muammo | Yechim |
|---|---|
| `/chat` hali ham 404 | `NEXT_PUBLIC_API_URL` backend manziliga to'g'ri ulanganini va Vercel'da **qayta deploy** qilganingizni tekshiring. |
| Sayt "Couldn't reach the backend" deydi | Backend Space "Running" (yashil) holatда emas — HF Space'ni oching, log'ларни ko'ring. Kalit (`GOOGLE_API_KEY`) qo'yilganini tekshiring. |
| Backend qizil "Runtime error" | Ko'pincha `GOOGLE_API_KEY` yo'q yoki xato. Settings → secrets ni tekshiring. |
| Javoblar sekin | Bepul CPU'da birinchi so'rov sekinroq bo'ladi — normal holat. |
