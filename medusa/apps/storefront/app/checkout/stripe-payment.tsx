"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe, type Stripe } from "@stripe/stripe-js"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// Stripe is "configured" on the storefront when the publishable key is present.
// The checkout uses this to decide between the card flow and the manual flow.
export const stripeConfigured = Boolean(PUBLISHABLE_KEY)

// loadStripe must be called once, outside render, with the publishable key.
let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!stripePromise && PUBLISHABLE_KEY) {
    stripePromise = loadStripe(PUBLISHABLE_KEY)
  }
  return stripePromise
}

type Props = {
  clientSecret: string
  loading: boolean
  setLoading: (v: boolean) => void
  setError: (v: string) => void
  // Called after the card is confirmed; completes the cart into an order.
  onPaid: () => Promise<void>
}

function CardForm({ loading, setLoading, setError, onPaid }: Omit<Props, "clientSecret">) {
  const stripe = useStripe()
  const elements = useElements()

  async function pay() {
    if (!stripe || !elements) return
    setLoading(true)
    setError("")

    // Validate and submit the Elements form first.
    const submit = await elements.submit()
    if (submit.error) {
      setError(submit.error.message ?? "Please check your card details.")
      setLoading(false)
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })

    if (error) {
      setError(error.message ?? "Card payment could not be completed.")
      setLoading(false)
      return
    }

    const ok =
      paymentIntent &&
      ["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)

    if (ok) {
      await onPaid()
    } else {
      setError("Payment was not completed. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="stripe-pay">
      <PaymentElement />
      <button
        type="button"
        className="add-btn"
        disabled={!stripe || loading}
        onClick={pay}
      >
        {loading ? "Processing…" : "Pay & place order"}
      </button>
    </div>
  )
}

// Dark Stripe Elements theme tuned to the storefront's palette.
const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "#0a0a0a",
    colorText: "#ededed",
    colorTextSecondary: "#9ca3af",
    colorDanger: "#ff6b6b",
    borderRadius: "10px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  rules: {
    ".Input": { border: "1px solid #262626" },
    ".Input:focus": { border: "1px solid #525252", boxShadow: "none" },
    ".Tab, .Block": { border: "1px solid #262626" },
  },
}

export function StripePayment({ clientSecret, ...rest }: Props) {
  const promise = getStripe()
  if (!promise || !clientSecret) return null
  return (
    <Elements stripe={promise} options={{ clientSecret, appearance }}>
      <CardForm {...rest} />
    </Elements>
  )
}
