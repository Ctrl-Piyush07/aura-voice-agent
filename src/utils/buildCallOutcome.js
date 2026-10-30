export function buildCallOutcome(transcript = []) {
  // --------------------------------------------
  // 1. Prepare transcript and customer messages
  // --------------------------------------------

  const messages = Array.isArray(transcript) ? transcript : [];

  const customerMessages = messages
    .filter((entry) => entry.speaker === "Customer")
    .map((entry) => String(entry.text || ""));

  const customerText = customerMessages.join(" ");
  const latestMessage = customerMessages.at(-1) || "";

  // --------------------------------------------
  // 2. Extract order ID
  // Handles ORD-101, ORD 101, ORDER 101, RD 101
  // --------------------------------------------

  const orderIds = [
    ...customerText.matchAll(/\b(?:ORD|ORDER|RD)[\s-]*(\d{3,})\b/gi),
  ];

  const orderId = orderIds.length > 0 ? `ORD-${orderIds.at(-1)[1]}` : null;

  // --------------------------------------------
  // 3. Identify the latest customer intent
  // --------------------------------------------

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

  // --------------------------------------------
  // 4. Find the latest meaningful Aria response
  // --------------------------------------------

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

  // --------------------------------------------
  // 5. Detect failures or out-of-scope requests
  // --------------------------------------------

  const hasFailure =
    /having trouble responding|not found|couldn't find|could not find|unable to find/i.test(
      lastReply,
    );

  const outOfScopeRefusal =
    customerIntent === "general_support" &&
    /\bAura Skincare\b/i.test(lastReply) &&
    /only help|only assist|can't book|cannot book|outside (my|the) scope/i.test(
      lastReply,
    );

  if (outOfScopeRefusal) {
    customerIntent = "out_of_scope";
  }

  // --------------------------------------------
  // 6. Detect requests requiring human support
  // --------------------------------------------

  const needsHumanSupport = ["cancellation_request", "refund_request"].includes(
    customerIntent,
  );

  // --------------------------------------------
  // 7. Detect return/refund denied by policy
  // --------------------------------------------

  const policyDenied =
    ["refund_request", "return_query"].includes(customerIntent) &&
    /\b(return|refund)\b/i.test(lastReply) &&
    /\b(cannot|can't|won't|will not|not eligible)\b/i.test(lastReply) &&
    /\b(return policy|7 days|unopened|unused|original packaging)\b/i.test(
      lastReply,
    );

  // --------------------------------------------
  // 8. Detect cancellation denied by policy
  // --------------------------------------------

  const cancellationDenied =
    customerIntent === "cancellation_request" &&
    /\b(shipped|out for delivery)\b/i.test(lastReply) &&
    /\bcancel\w*\b/i.test(lastReply);

  // --------------------------------------------
  // 9. Determine resolution status
  // --------------------------------------------

  let resolutionStatus = "information_provided";

  if (
    customerMessages.length === 0 ||
    lastReplyIndex < lastCustomerIndex ||
    hasFailure ||
    (customerIntent === "order_tracking" && !orderId)
  ) {
    resolutionStatus = "unresolved";
  } else if (outOfScopeRefusal) {
    resolutionStatus = "declined_out_of_scope";
  } else if (policyDenied || cancellationDenied) {
    resolutionStatus = "denied_by_policy";
  } else if (needsHumanSupport) {
    resolutionStatus = "requires_human_support";
  }

  // --------------------------------------------
  // 10. Build the call summary
  // --------------------------------------------

  let callSummary = "";

  if (customerMessages.length === 0) {
    callSummary = "No customer request was recorded.";
  } else if (resolutionStatus === "unresolved") {
    callSummary =
      "The customer made a support enquiry, but the latest request was not successfully answered.";
  } else if (resolutionStatus === "declined_out_of_scope") {
    callSummary =
      "Customer requested assistance outside Aura Skincare support. Aria politely declined and redirected the customer to brand-related queries. No external action was taken.";
  } else if (resolutionStatus === "denied_by_policy") {
    callSummary =
      customerIntent === "cancellation_request"
        ? "Customer requested cancellation of an order that had already shipped or was out for delivery. Aria explained that cancellation was not permitted. No cancellation was performed."
        : "Customer requested a return or refund. Aria explained that the request was not permitted under the return policy. No return or refund was processed.";
  } else if (resolutionStatus === "requires_human_support") {
    callSummary =
      "The customer requested assistance that requires human support. No order modification was performed.";
  } else {
    callSummary =
      "The customer made a support enquiry. Aria provided an informational response without performing an order action.";
  }

  // --------------------------------------------
  // 11. Return structured JSON outcome
  // --------------------------------------------

  return {
    customer_intent: customerIntent,
    order_id: orderId,
    resolution_status: resolutionStatus,
    call_summary: callSummary,
  };
}
