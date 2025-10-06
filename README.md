# AcademicTechnexus Avatar Frontend

This repo contains the Next.js frontend for the Avatar chat widget.
It expects a backend endpoint (Railway) that implements POST /v1/chat and returns JSON { text, avatar_video_url?, recommended_products? }.

## Environment Variables (Vercel)
- NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/v1/chat
- NEXT_PUBLIC_API_KEY=your_frontend_token_for_testing
- NEXT_PUBLIC_SHOP=demo-shop.myshopify.com (optional)

## Run locally
1. npm install
2. cp .env.local.example .env.local
3. Fill in your environment variables
4. npm run dev
