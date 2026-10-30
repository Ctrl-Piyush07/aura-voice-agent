const transferPromisePatterns = [
  // "I'll connect you", "I will transfer you"
  /\b(?:i(?:'ll| will| can| could| would| am going to)|we(?:'ll| will| can| could| would| are going to))\s+(?:(?:be happy to|gladly|now|directly|right away|immediately)\s+)*(?:connect|transfer|patch)\s+you\b/i,

  // "I'll put you through"
  /\b(?:i|we)(?:'ll| will| can)\s+put you through\b/i,

  // "I'm connecting you"
  /\b(?:i(?:'m| am)|we(?:'re| are))\s+(?:connecting|transferring)\s+you\b/i,

  // "Would you like me to connect you?"
  /\b(?:let me|shall i|should i|would you like me to|do you want me to)\s+(?:connect|transfer|patch|put you through)\b/i,
];

const holdPatterns = [
  /\bplease hold(?: on)?\b/i,
  /\bplease stay on the line\b/i,
];

export function enforceResponseGuardrails(reply) {
  if (typeof reply !== "string") {
    return "";
  }

  const sentences = reply.trim().split(/(?<=[.!?])\s+/);

  const isUnsafeTransferPromise = (sentence) =>
    transferPromisePatterns.some((pattern) => pattern.test(sentence));

  const containsUnsafePromise = sentences.some(isUnsafeTransferPromise);

  // Keep normal replies unchanged.
  if (!containsUnsafePromise) {
    return reply;
  }

  // Remove unsupported transfer promises.
  const safeSentences = sentences.filter(
    (sentence) =>
      !isUnsafeTransferPromise(sentence) &&
      !holdPatterns.some((pattern) => pattern.test(sentence)),
  );

  const safeReply = safeSentences.join(" ").trim();

  const clarification =
    "I can't connect or transfer calls to a human " +
    "support representative directly. Please contact " +
    "Aura Skincare support separately.";

  return safeReply ? `${safeReply} ${clarification}` : clarification;
}
