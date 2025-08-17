export default function MockPayment() {
  const params = new URLSearchParams(window.location.search);
  const mock = params.has("mockPayment");

  return (
    <div>
      <button data-testid="billing-setup-cta">Add card</button>
      {mock && <span data-testid="saved-pm-badge">Payment method saved</span>}
    </div>
  );
}
