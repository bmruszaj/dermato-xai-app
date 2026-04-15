# Dermatology Annotation Flow — Getting Started

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with these values:

```
# Generate a random secret for NextAuth
AUTH_SECRET=<generate-with-openssl rand -base64 32>

# AI Gateway token (from Vercel)
AI_GATEWAY_API_KEY=****

# Vercel Blob token (for file uploads) — optional for annotation page
BLOB_READ_WRITE_TOKEN=****

# PostgreSQL URL (for chat history) — optional for annotation page
POSTGRES_URL=****

# Redis URL (for streams) — optional for annotation page
REDIS_URL=****

# Clarin API token (LLM feedback generation)
CLARIN_API_KEY=********

# Modal RF-DETR ML endpoint
MODAL_RFDETR_URL=****
```

**Note:** The annotation page (`/annotate`) works standalone and doesn't require the database/blob/Redis tokens. It only needs `AUTH_SECRET`, `CLARIN_API_KEY`, and `MODAL_RFDETR_URL`.

### 3. Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Or visit https://generate-secret.vercel.app/32 for a quick online generator.

### 4. Run the development server

```bash
pnpm dev
```

The server starts at `http://localhost:3000`.

### 5. Navigate to the annotation page

Visit: **`http://localhost:3000/annotate`**

---

## The Annotation Flow

### Phase 1: Upload
- Drag-and-drop or click to upload a dermoscopic image (PNG, JPG, WEBP)
- ML model inference starts **automatically** in the background
- Visual indicator shows model status

### Phase 2: Annotating
- **Draw bounding boxes** on the image with your mouse
  - Click and drag to create a box
  - Double-click on a box to edit its label
  - Hover over a box and click the X to delete
  - Drag a selected box to move it
  - Use corner/edge handles to resize

- **Choose label** for each box from 5 predefined classes:
  - Rosettes
  - Milia-like-cyst
  - Blue-gray globules
  - MAY globules
  - Yellow globlues (ulcer)

- Status badge shows:
  - 🟡 "Model analizuje obraz..." (yellow, spinning) — waiting for ML
  - 🟢 "Model gotowy — N detekcji" (green) — ML predictions ready
  - 🔴 "Błąd ML" (red) — ML failed; comparison will skip

### Phase 3: Submission
- Click **"Zatwierdź adnotacje"** button
- System waits for ML predictions (if still loading)
- Compares your boxes with model predictions using IoU ≥ 0.3
- Sends comparison to Clarin API for LLM feedback generation

### Phase 4: Feedback
- **AI-generated feedback** in Polish from Clarin LLM (llama3.1)
- Shows:
  - ✅ What was correct
  - ❌ What can be improved (false positives / missed detections)
  - 💡 Suggestions for next time

- **Two buttons:**
  - "Popraw adnotacje" — return to phase 2 to refine boxes
  - "Zacznij od nowa" — reset and upload new image

---

## Available Scripts

```bash
# Development server (Turbopack, hot reload)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type check
pnpm exec tsc --noEmit --skipLibCheck

# Format/lint with Biome
pnpm check
pnpm fix
```

---

## Architecture

### Directory Structure

**Library (reusable logic):**
- `lib/annotate/types.ts` — shared types (AnnotationBox, ModelPrediction, ComparisonResult)
- `lib/annotate/compare.ts` — IoU matching algorithm
- `lib/annotate/prompt.ts` — Polish LLM prompt builder
- `lib/annotate/clarin-feedback.ts` — Clarin API client (server-only)

**Components (UI):**
- `components/annotate/BBoxAnnotator/` — main annotation canvas (from react-bbox-annotator)
- `components/annotate/UploadZone.tsx` — drag-and-drop image upload
- `components/annotate/AnnotationCanvas.tsx` — wrapper with 5 predefined labels
- `components/annotate/FeedbackPanel.tsx` — feedback display UI

**Routes:**
- `app/(annotate)/annotate/page.tsx` — main orchestration page with state machine
- `app/(annotate)/api/predict/route.ts` — proxy to Modal RF-DETR endpoint
- `app/(annotate)/api/feedback/route.ts` — proxy to Clarin LLM endpoint
- `app/(annotate)/layout.tsx` — standalone layout (no auth, no sidebar)

### Data Flow

```
User Upload Image
       ↓
[UploadZone converts to base64 data URI]
       ↓
[ML request fires to /api/predict → Modal]
[User annotates in parallel]
       ↓
User clicks "Zatwierdź adnotacje"
       ↓
[compareAnnotations() — IoU matching]
       ↓
[Feedback request to /api/feedback → Clarin LLM]
       ↓
Polish feedback displayed
```

---

## ML Endpoint — RF-DETR Large

- **URL:** `https://dermatoai--rfdetr-large-labelstudio-backend.modal.run`
- **Model:** RF-DETR Large (A100 GPU)
- **Classes:** Single class — "Yellow globlues (ulcer)"
- **Timeout:** 5 minutes cold-start, ~30 seconds warm
- **Input:** Base64 data URI image
- **Output:** `{ predictions: [{ x, y, width, height, confidence }, ...] }`

---

## Clarin LLM Endpoint

- **URL:** `https://services.clarin-pl.eu/api/v1/oapi/chat/completions`
- **Model:** `llama3.1`
- **Temperature:** 0.7 (creative)
- **Max tokens:** 1500
- **Language:** Polish
- **Auth:** Bearer token + x-token header

---

## Troubleshooting

### ❌ AUTH_SECRET error

```
MissingSecret: Please define a `secret`
```

**Solution:** Generate and add `AUTH_SECRET` to `.env.local`:

```bash
openssl rand -base64 32
```

### ❌ CLARIN_API_KEY error

```
CLARIN_API_KEY not configured on server
```

**Solution:** Ensure `.env.local` has:
```
CLARIN_API_KEY=ys2sTge3at5lvtFJQjJh0t9pIZmXMyY2xw91X3w3ZS5qij3M
```

### ❌ Modal endpoint timeout

If ML is slow:
- Check Modal pod status: https://modal.com/
- Cold-start can take 2-15 minutes on first run
- Feedback will work without model comparison if ML fails

### ❌ Port 3000 already in use

```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Or use different port
pnpm dev -- -p 3001
```

---

## Performance Notes

- **First ML request:** 2-15 min (model loads on A100)
- **Subsequent ML requests:** ~30 seconds
- **LLM feedback generation:** 10-30 seconds
- **Annotation editing:** Real-time (local state)

---

## Browser Compatibility

- **Chrome/Chromium:** ✅ Full support
- **Firefox:** ✅ Full support
- **Safari:** ⚠️ May have minor styling issues
- **Mobile:** ❌ Not optimized (desktop only)

---

## Next Steps

1. **Run locally:** `pnpm dev` → `http://localhost:3000/annotate`
2. **Upload an image** (dermoscopic / skin lesion)
3. **Draw bounding boxes** on lesions
4. **Wait for ML** (badge shows status)
5. **Submit annotations** → get feedback

Enjoy!
