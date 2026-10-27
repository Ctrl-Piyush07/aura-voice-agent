const orders = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    value: 699,
    status: "Out for Delivery",
    notes: "BlueDart BD-982103. Expected by 6 PM today",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    value: 499,
    status: "Delivered",
    notes: "Delhivery DL-441029. Delivered 14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    value: 850,
    status: "Processing",
    notes: "Ordered 3 hours ago. Eligible for cancellation",
  },
];

export default function TestOrders() {
  return (
    <section className="orders-section">
      <h2>Test Orders</h2>
      <p>Use these order IDs to test Aria.</p>

      <div className="orders-grid">
        {orders.map((order) => (
          <div className="order-card" key={order.id}>
            <strong>{order.id}</strong>
            <p>{order.customer}</p>
            <p>{order.product}</p>
            <p>₹{order.value}</p>
            <span className="order-status">{order.status}</span>
            <small>{order.notes}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
