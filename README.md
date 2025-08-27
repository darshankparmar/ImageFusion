# Photofusion

A simple Next.js app to generate product shots: upload a base image and a product image, enter a prompt, get a fused result.

Deploy
- Set `GOOGLE_API_KEY` in your platform (e.g., Vercel → Settings → Environment Variables)
- Build: `npm run build`

Local dev (Windows CMD)
```
cd /d d:\Work\Projects\ImageFusion\vercel-next
npm install
set GOOGLE_API_KEY=YOUR_KEY_HERE && npm run dev
```
Open http://localhost:3001

Notes
- API route: `app/api/fuse/route.ts`
- UI: `app/page.tsx`
- Model: `gemini-2.5-flash-image-preview`
- Large images may be slow; consider downscaling
