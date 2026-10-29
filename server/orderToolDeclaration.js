export const orderToolDeclaration = {
  name: "get_order_details",

  description:
    "Retrieve verified order details from Aura Skincare's order database. Use this function whenever a customer asks about an order's status, tracking, delivery, or cancellation eligibility.",

  parametersJsonSchema: {
    type: "object",

    properties: {
      order_id: {
        type: "string",
        description:
          "The customer's order ID, for example ORD-101, ORD-102, or ORD-103.",
      },
    },

    required: ["order_id"],

    additionalProperties: false,
  },
};
