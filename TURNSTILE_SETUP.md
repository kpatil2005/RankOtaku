# Cloudflare Turnstile Setup Instructions

## 1. Get Turnstile Keys (FREE)

1. Go to https://dash.cloudflare.com/
2. Sign up or login (free account)
3. Go to "Turnstile" in the sidebar
4. Click "Add Site"
5. Enter your domain (or use `localhost` for testing)
6. Choose "Managed" mode (recommended)
7. Copy the **Site Key** and **Secret Key**

## 2. Add to Frontend (.env)

Add to `frontend/.env`:

```
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

## 3. Add to Backend (.env)

Add to `backend/.env`:

```
TURNSTILE_SECRET_KEY=your_secret_key_here
```

## 4. Testing

For local development, you can use Cloudflare's test keys:

**Frontend (Site Key):**
```
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

**Backend (Secret Key):**
```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

These test keys will always pass verification.

## 5. Production

For production, use your real keys from Cloudflare dashboard.

## Features

- ✅ Prevents bot signups
- ✅ Prevents bot logins
- ✅ Prevents password reset spam
- ✅ Free forever
- ✅ Privacy-friendly (no Google tracking)
- ✅ Dark theme matches your site
- ✅ Minimal user interaction
