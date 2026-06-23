import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL

// In production, back the cache, event bus, and workflow engine with Redis so
// events (and our re-indexing subscribers) survive restarts and scale across
// instances. Without REDIS_URL, Medusa falls back to in-memory — fine for local
// dev, not for production.
const redisModules = REDIS_URL
  ? [
      { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl: REDIS_URL } },
      { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl: REDIS_URL } },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: { redis: { url: REDIS_URL } },
      },
    ]
  : []

// Stripe card payments activate only when STRIPE_API_KEY is set. Until then the
// store uses the built-in manual provider (pp_system_default), so checkout works
// without Stripe. The "system" provider stays available alongside Stripe.
const STRIPE_API_KEY = process.env.STRIPE_API_KEY
const paymentModules = STRIPE_API_KEY
  ? [
      {
        resolve: "@medusajs/medusa/payment",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/payment-stripe",
              id: "stripe",
              options: {
                apiKey: STRIPE_API_KEY,
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              },
            },
          ],
        },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "./src/modules/semantic-search",
    },
    ...redisModules,
    ...paymentModules,
  ],
})
