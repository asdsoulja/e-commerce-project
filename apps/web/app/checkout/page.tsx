import { CheckoutForm } from "@/components/forms/checkout-form";

export default function CheckoutPage() {
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Checkout</h2>
        <p className="text-sm text-slate-600">
          The payment service follows the project spec dummy algorithm and may reject requests.
        </p>
      </div>
      <CheckoutForm />
    </section>
  );
}
