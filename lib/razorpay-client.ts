"use client";

export interface RazorpayCheckoutSuccess {
  razorpay_payment_id?: string;
  razorpay_subscription_id: string;
  razorpay_signature?: string;
}

export interface RazorpayCheckoutError {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: Record<string, string>;
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { email: string };
  theme: { color: string };
  handler: (response: RazorpayCheckoutSuccess) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckoutInstance {
  open(): void;
  on(event: "payment.failed", callback: (response: { error?: RazorpayCheckoutError }) => void): void;
}

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const getRazorpayConstructor = () =>
  (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
let checkoutScriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is available only in the browser."));
  }
  if (getRazorpayConstructor()) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => getRazorpayConstructor()
      ? resolve()
      : reject(new Error("Razorpay Checkout could not be initialized."));
    script.onerror = () => reject(new Error("Razorpay Checkout failed to load. Check your connection and try again."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    checkoutScriptPromise = null;
    throw error;
  });

  return checkoutScriptPromise;
}

export interface OpenRazorpayCheckoutInput {
  subscriptionId: string;
  /** Test Mode key ID returned by the authenticated checkout API. */
  keyId: string;
  userEmail: string;
  workspaceName: string;
  onSuccess: (response: RazorpayCheckoutSuccess) => void | Promise<void>;
  onError: (error: Error) => void;
}

/** Loads Razorpay's hosted Checkout.js only when the owner starts checkout. */
export async function openRazorpayCheckout({
  subscriptionId,
  keyId,
  userEmail,
  workspaceName,
  onSuccess,
  onError,
}: OpenRazorpayCheckoutInput): Promise<void> {
  try {
    await loadCheckoutScript();
    const Razorpay = getRazorpayConstructor();
    if (!Razorpay) throw new Error("Razorpay Checkout is unavailable.");

    const checkout = new Razorpay({
      key: keyId,
      subscription_id: subscriptionId,
      name: "roducq",
      description: `Monthly workspace plan · ${workspaceName}`,
      prefill: { email: userEmail },
      theme: { color: "#6d4aff" },
      handler: (response) => {
        void Promise.resolve(onSuccess(response)).catch((error: unknown) => {
          onError(error instanceof Error ? error : new Error("Payment confirmation could not be refreshed."));
        });
      },
      modal: {
        ondismiss: () => onError(new Error("Checkout was closed before payment confirmation.")),
      },
    });
    checkout.on("payment.failed", ({ error }) => {
      onError(new Error(error?.description || "Payment could not be completed. Please try again."));
    });
    checkout.open();
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Could not start Razorpay Checkout."));
  }
}
