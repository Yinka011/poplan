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

  const idempotencyKey = `${brandEmail}_${Date.now()}`;
  const objects: any[] = [];

  items.forEach((item: any, index: number) => {
    const basePrice = Math.round(Number(item.base_price || 0) * 100);
    const variations = item.variations && item.variations.length > 0 ? item.variations : [{ size: "One Size", colour: "Default", quantity: 1, price: item.base_price }];

    const squareVariations = variations.map((v: any, vIndex: number) => {
      const varPrice = Math.round(Number(v.price || item.base_price || 0) * 100);
      const varName = [v.size, v.colour].filter(x => x && x !== "N/A" && x !== "One Size").join(" / ") || "Regular";
      return {
        type: "ITEM_VARIATION",
        id: `#${brandEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${index}_v${vIndex}_${Date.now()}`,
        item_variation_data: {
          name: varName,
          pricing_type: "FIXED_PRICING",
          price_money: {
            amount: varPrice > 0 ? varPrice : basePrice,
            currency: "USD",
          },
          track_inventory: true,
        },
      };
    });

    objects.push({
      type: "ITEM",
      id: `#${brandEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${index}_${Date.now()}`,
      item_data: {
        name: `${brandName} — ${item.name}`,
        description: `Brand: ${brandName} | Category: ${item.category || ""}`,
        variations: squareVariations,
      },
    });
  });

  const response = await fetch("https://connect.squareup.com/v2/catalog/batch-upsert", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      batches: [{ objects }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Square error:", JSON.stringify(data.errors));
    return NextResponse.json({ error: data.errors?.[0]?.detail || "Square error" }, { status: 400 });
  }

  return NextResponse.json({ success: true, catalogIds: data.id_mappings || [] });
}
