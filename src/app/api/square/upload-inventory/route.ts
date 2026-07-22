import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { items, brandName, brandEmail } = await request.json();

  if (!items || !brandName) {
    return NextResponse.json({ error: "Missing items or brand name" }, { status: 400 });
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!accessToken || !locationId) {
    return NextResponse.json({ error: "Square not configured" }, { status: 500 });
  }

  // Build Square catalog objects for each item
  const objects = items.map((item: { name: string; price: number; quantity: number; category: string }, index: number) => ({
    type: "ITEM",
    id: `#${brandEmail.replace(/[@.]/g, "_")}_${index}_${Date.now()}`,
    item_data: {
      name: `${brandName} — ${item.name}`,
      description: `Brand: ${brandName} | Category: ${item.category}`,
      variations: [
        {
          type: "ITEM_VARIATION",
          id: `#${brandEmail.replace(/[@.]/g, "_")}_${index}_var_${Date.now()}`,
          item_variation_data: {
            name: "Regular",
            pricing_type: "FIXED_PRICING",
            price_money: {
              amount: Math.round(item.price * 100),
              currency: "USD",
            },
            track_inventory: true,
          },
        },
      ],
    },
  }));

  const response = await fetch("https://connect.squareup.com/v2/catalog/batch-upsert", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      idempotency_key: `${brandEmail}_${Date.now()}`,
      batches: [{ objects }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: data.errors?.[0]?.detail || "Square error" }, { status: 400 });
  }

  // Extract the catalog IDs that Square assigned
  const catalogIds = data.id_mappings || [];

  return NextResponse.json({ success: true, catalogIds, objects: data.objects });
}
