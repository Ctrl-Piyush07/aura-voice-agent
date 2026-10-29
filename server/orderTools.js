import orders from "./orders.json" with { type: "json" };

// Retrieve verified order details from the mock database
export function getOrderDetails(orderId) {
  if (typeof orderId !== "string" || !orderId.trim()) {
    return {
      error: "A valid order ID is required.",
    };
  }

  const normalizedOrderId = orderId.trim().toUpperCase();

  const order = orders[normalizedOrderId];

  if (!order) {
    return {
      error: "Order not found.",
      order_id: normalizedOrderId,
    };
  }

  return {
    order_id: normalizedOrderId,
    ...order,
  };
}
