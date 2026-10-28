import express from "express";
import cors from "cors";
import orders from "./orders.json" with { type: "json" };

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Aura Voice Agent Backend",
  });
});

// Mock order lookup
app.get("/api/orders/:orderId", (req, res) => {
  const orderId = req.params.orderId.toUpperCase();
  const order = orders[orderId];

  if (!order) {
    return res.status(404).json({
      error: "Order not found",
      order_id: orderId,
    });
  }

  res.json(order);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
