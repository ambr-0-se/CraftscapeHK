# Craftscape HK (藝守)

<div align="center">
<img alt="CraftsHK AI Banner" src="https://raw.githubusercontent.com/gracetyy/CraftscapeHK/refs/heads/main/thumbnail.jpg" />
</div>

## Live Demo
**Try our app on [https://craftscape-hk.vercel.app/](https://craftscape-hk.vercel.app/)!**

## Inspiration  
Hong Kong’s traditional crafts—such as **hand-carved mahjong tiles, painted porcelain, cheongsam, and neon sign**—are fading due to shrinking markets and an aging artisan community. 

**More than 70%** of craft shops have shut in recent years as demand wanes and rents spike, typical **revenues have fallen 30–50%** amid mass-produced competition, and **80% of artisans** say their children won’t continue the trade because of long hours, low pay, and little recognition. 

We wanted to build a bridge between the past and the future, enabling young people and global visitors to not only appreciate but also interact with these disappearing arts, and translating the appreciation into tangible support. **Because the most meaningful way to preserve a craft is to create a thriving economy around it.**

## What it does  
Craftscape HK is an **AI + AR e-commerce platform** where users can:  
- Explore craft stories through a swipe-card interface (like Tinder).  
- Use the **AI Creation Studio** to design their own craft pieces and directly commission artisans to bring them to life.  
- Experience **AR interactive virtual exhibitions** with 360° product views, real-world photo integration, and immersive storytelling.  
- Access a **city-wide cultural events calendar** for exhibitions, workshops, and community activities.  
- Support artisans by purchasing products, attending workshops, and visiting virtual/AR exhibitions.  

## How we built it  
- **Frontend**: A React 19 + TypeScript interface bundled with Vite, styled through Tailwind CSS (via CDN) and Framer Motion for micro-interactions to deliver the swipeable, mobile-first experience.
- **Backend - Platform APIs & data layer**: Modular NestJS endpoints for crafts, products, events, orders, and messaging run on TypeORM with a SQLite store, exposing REST routes that the frontend consumes via a typed API client with authenticated fetch helpers and offline fallbacks.
- **Function - AI Creation Studio**: A NestJS AI microservice wraps Google’s Imagen 4.0 (exposed through the @google/genai SDK) and returns base64 renders that the AiStudio view consumes and stores in the shared context, so artisans receive customizable design briefs.
- **Function - AR & experiential layer**: The Play screen ships downloadable USDZ assets (scanned by Reality Composer with iPhone)so visitors can launch Quick Look/WebAR sessions from their phones, complementing the narrative exhibition content in-app.

## Challenges we ran into  
- Limited digital archives for crafts like hand-carved mahjong required manual data collection.  
- Many artisans are elderly and unfamiliar with digital tools, so onboarding needed special care and training.  
- Balancing **AI-generated creativity** with respect for authentic craft aesthetics was challenging.  
- Ensuring sustainability: making the platform engaging for users while providing artisans with fair income.  

## Accomplishments that we're proud of  
- Built an early prototype of the **AI Creation Studio** that generates personalized craft designs.  
- Successfully piloted a working **AR exhibition demo** with 360° artifact viewing and real-world photo integration.  
- Engaged real artisans in co-design workshops to validate cultural and practical feasibility.  
- Developed a model for integrating cultural heritage into everyday digital life.  

## What we learned  
- Technology must act as a **bridge, not a replacement**, for traditional knowledge.  
- AR is powerful for creating immersive cultural experiences that attract young users.  
- The sustainability of cultural projects depends on building both **emotional connection** and **economic value** for artisans.  
- Community collaboration is as important as technical innovation.  

## What's next for Craftscape HK  
- Expand our dataset of traditional crafts by partnering with museums, NGOs, and cultural heritage groups.  
- Refine the **AI Creation Studio** to support more customization and multi-modal input (sketch + text).  
- Launch **pilot AR exhibitions** in collaboration with local cultural centers and schools.  
- Explore monetization pathways to ensure artisans benefit directly from sales and commissions.  
- Scale Craftscape HK into a **global platform for cultural heritage preservation**, starting with Hong Kong but extending to other endangered crafts worldwide.

## Quick Start

### System Requirements
- **Node.js** v18+
- **npm** v8+
- Modern browser (Chrome, Firefox, Safari)

### Installation & Setup

1. **Clone the Project**
   ```bash
   git clone https://github.com/gracetyy/CraftscapeHK
   cd CraftscapeHK
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```
   > The root `postinstall` hook installs the NestJS backend in `server/` so you only run this once.

3. **Set Environment Variables**
   Create a `.env` file in the repository root. For the default direct Google setup:
   ```bash
   GEMINI_API_KEY="<replace_this_with_your_api_key>"
   ```
   Both the Vite app and the NestJS API will consume it.

   You may also add these lines to override the models used by the AI service:
   ```bash
   GOOGLE_AI_TEXT_MODEL="gemini-3.5-flash"
   GOOGLE_AI_IMAGE_MODEL="gemini-3.1-flash-image"
   ```

   HKU ITS Gemini/OpenAI credits are also supported. Get the subscription key and operation details from the [HKU ITS developer portal](https://developer.hku.hk/), then configure:
   ```bash
   AI_PROVIDER="hku"
   AI_IMAGE_PROVIDER_ORDER="hku-gemini,hku-openai,google"

   HKU_GEMINI_API_KEY="<replace_this_with_your_hku_subscription_key>"
   HKU_GEMINI_BASE_URL="https://api.hku.hk/gemini/student"
   HKU_GEMINI_TEXT_DEPLOYMENT_ID="gemini-3.5-flash"
   HKU_GEMINI_IMAGE_DEPLOYMENT_IDS="gemini-3.1-flash-image,gemini-2.5-flash-image,gemini-3-pro-image"

   HKU_OPENAI_IMAGE_DEPLOYMENT_IDS="gpt-image-1.5,gpt-image-2"
   HKU_OPENAI_API_VERSION="2025-04-01-preview"
   ```

4. **Seed Database**
   ```bash
   npm run server:seed
   ```

5. **Run the Full Stack with Auto-Restarting env files**
   ```bash
   npm run dev:stack:watch
   ```

6. **Access the Application**
   - 🌐 **Frontend**: http://localhost:3000
   - 🚀 **Backend API**: http://localhost:3001/api

### Helpful npm Scripts
- `npm run dev:stack` – run frontend (`vite`) and backend (`nest start:dev`) together without env watching.
- `npm run dev:stack:watch` – same as above but restarts both processes whenever `.env` files change.
- `npm run build:stack` – produce production builds for the Vite app and the NestJS server in one step.
- `npm run server:start` – boot the compiled NestJS server (`npm run server:build` first if needed).

### AI Setup

#### Environment variables
- `AI_PROVIDER` — `google` or `hku` (defaults to `google`)
- `AI_IMAGE_PROVIDER_ORDER` — comma-separated fallback order, e.g. `hku-gemini,hku-openai,google`
- `GEMINI_API_KEY` — Google AI Studio API key for direct Google fallback
- `GOOGLE_AI_TEXT_MODEL` — optional direct Google text model override
- `GOOGLE_AI_IMAGE_MODEL` — optional direct Google image model override
- `HKU_GEMINI_API_KEY` — HKU ITS developer portal subscription key
- `HKU_GEMINI_BASE_URL` — defaults to `https://api.hku.hk/gemini/student`
- `HKU_GEMINI_TEXT_DEPLOYMENT_ID` — HKU Gemini text deployment id
- `HKU_GEMINI_IMAGE_DEPLOYMENT_IDS` — comma-separated HKU Gemini image deployment fallback list
- `HKU_OPENAI_IMAGE_DEPLOYMENT_IDS` — comma-separated HKU OpenAI image deployment fallback list
- `HKU_OPENAI_API_VERSION` — HKU OpenAI image API version, currently `2025-04-01-preview`

Place the variable in your shell or a .env loaded by your process manager before starting the server.

#### Image generation providers and quotas
The `api/ai/generate-image` endpoint supports a provider fallback chain. It tries each configured provider/model in order and skips quota/rate-limit/provider-unavailable errors before trying the next one.

HKU ITS credits are available through the [HKU ITS developer portal](https://developer.hku.hk/). Current student quota limits shown in the portal:

| Provider | Deployment | Limit |
| --- | --- | --- |
| HKU Gemini | `gemini-2.5-flash-image` | 70/week |
| HKU Gemini | `gemini-3.1-flash-image` | 35/week |
| HKU Gemini | `gemini-3-pro-image` | 15/week |
| HKU OpenAI | `gpt-image-1.5` | 70/week |
| HKU OpenAI | `gpt-image-2` | 70/week |

HKU OpenAI image generation uses:

```text
POST https://api.hku.hk/openai/student/{deployment-id}/images/generations?api-version=2025-04-01-preview
```

The HKU gateway currently expects the subscription key as a query parameter named `subscription-key`.

Direct Google image generation is still supported as a fallback, but Google’s free tier may have no image-generation quota for the configured image model.

Do this:
1. For HKU, create/select a subscription in the HKU ITS developer portal and set `HKU_GEMINI_API_KEY`
2. For direct Google fallback, create/select a Google AI Studio key and set `GEMINI_API_KEY`
3. Configure `AI_IMAGE_PROVIDER_ORDER` to control fallback order
4. Restart the NestJS server

#### Troubleshooting
- HKU `401` missing subscription key: check `HKU_GEMINI_API_KEY` / `HKU_OPENAI_API_KEY` and restart the backend.
- HKU `403 Out of call volume quota`: that deployment is out of quota; the fallback chain will try the next configured image provider.
- HKU `404 Resource not found`: check the operation URL and deployment id in the HKU developer portal.
- Google `API_KEY_INVALID`: wrong or stale `GEMINI_API_KEY`.
- Google `RESOURCE_EXHAUSTED`: direct Google quota is exhausted or unavailable for that model.

## Deployment

### Production Deployment
Both frontend and backend are containerized and deployed to Google Cloud Run:

**Quick Deploy (Both Services)**
```bash
npm run deploy:all
```

**Deploy Individual Services**
```bash
# Deploy frontend only
npm run deploy:frontend

# Deploy backend only
npm run deploy:backend
```

**Architecture**
- Frontend: React + Nginx on Cloud Run (Port 8080)
- Backend: NestJS API on Cloud Run (Port 8080)
- Database: SQLite (bundled with backend)
- Container Registry: Google Container Registry (GCR)


#### Local Docker Testing
```bash
# Test frontend container
npm run docker:test:frontend

# Test backend container
npm run docker:test

# Or manually
docker build -t craftscape-frontend .
docker run -p 8080:8080 craftscape-frontend
```

## License
Released under the MIT License.

<div align="center">
  <p>🎨 Made with ❤️ for Hong Kong Traditional Crafts 🇭🇰</p>
  <p>由 Winter Club 團隊開發</p>
</div>
