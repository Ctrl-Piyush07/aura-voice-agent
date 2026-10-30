export function buildCallOutcome(transcript = []) {
  const messages = Array.isArray(transcript) ? transcript : [];

  const customerMessages = messages
    .filter((entry) => entry.speaker === "Customer")
    .map((entry) => String(entry.text || ""));

  const customerText = customerMessages.join(" ");
  const latestMessage = customerMessages.at(-1) || "";

  // Extract the last order ID mentioned by the customer.
  // An extracted ID is not necessarily a verified order.
  // Recognize spoken and written order IDs:
  // "ORD-103", "ord 103", "ORD103", "order 103"

  const orderIds = [
    ...customerText.matchAll(/\b(?:ORD|ORDER)[\s-]*(\d{3,})\b/gi),
  ];

  const orderId = orderIds.length > 0 ? `ORD-${orderIds.at(-1)[1]}` : null;

  // Identify the most recent customer intent.
  let customerIntent = "general_support";

  if (/\b(cancel|cancellation)\b/i.test(latestMessage)) {
    customerIntent = "cancellation_request";
  } else if (/\brefund\b/i.test(latestMessage)) {
    customerIntent = "refund_request";
  } else if (/\b(damaged?|broken|leaking|replacement)\b/i.test(latestMessage)) {
    customerIntent = "damaged_product";
  } else if (/\b(return|exchange)\b/i.test(latestMessage)) {
    customerIntent = "return_query";
  } else if (/\b(cash on delivery|cod|upi)\b/i.test(latestMessage)) {
    customerIntent = "payment_query";
  } else if (
    /\b(shipping|delivery fee|delivery charge)\b/i.test(latestMessage)
  ) {
    customerIntent = "shipping_query";
  } else if (/\b(order|track|tracking|status)\b/i.test(latestMessage)) {
    customerIntent = "order_tracking";
  }

  // Ignore the initial greeting when evaluating responses.
  const isGreeting = (entry) =>
    /^Hi! I'm Aria from Aura Skincare/i.test(String(entry.text || ""));

  const lastCustomerIndex = messages.findLastIndex(
    (entry) => entry.speaker === "Customer",
  );

  const lastReplyIndex = messages.findLastIndex(
    (entry) => entry.speaker === "Aria" && !isGreeting(entry),
  );

  const lastReply =
    lastReplyIndex >= 0 ? String(messages[lastReplyIndex].text || "") : "";

  const hasFailure =
    /having trouble responding|not found|couldn't find|could not find|unable to find/i.test(
      lastReply,
    );

  const needsHumanSupport = ["cancellation_request", "refund_request"].includes(
    customerIntent,
  );

  let resolutionStatus = "information_provided";

  if (
    customerMessages.length === 0 ||
    lastReplyIndex < lastCustomerIndex ||
    hasFailure
  ) {
    resolutionStatus = "unresolved";
  } else if (needsHumanSupport) {
    resolutionStatus = "requires_human_support";
  }

  let callSummary = "";

  if (customerMessages.length === 0) {
    callSummary = "No customer request was recorded.";
  } else if (resolutionStatus === "unresolved") {
    callSummary =
      "The customer made a support enquiry, but the latest request was not successfully answered.";
  } else if (resolutionStatus === "requires_human_support") {
    callSummary =
      "The customer requested assistance that requires human support. No order modification was performed.";
  } else {
    callSummary =
      "The customer made a support enquiry. Aria provided an informational response without performing an order action.";
  }

  return {
    customer_intent: customerIntent,
    order_id: orderId,
    resolution_status: resolutionStatus,
    call_summary: callSummary,
  };
}
