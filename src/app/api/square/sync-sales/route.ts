import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { event, start_date, end_date } = await request.json();

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (!accessToken || !locationId) {
    return NextResponse.json({ error: "Square not configured" }, { status: 500 });
  }

  // Fetch completed orders from Square
  const startAt = start_date ? new Date(start_date).toISOString() : new Date("2026-09-11").toISOString();
  const endAt = end_date ? new Date(end_date).toISOString() : new Date("2026-09-14").toISOString();

  const ordersResponse = await fetch("https://connect.squareup.com/v2/orders/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      location_ids: [locationId],
      query: {
        filter: {
          date_time_filter: { created_at: { start_at: startAt, end_at: endAt } },
          state_filter: { states: ["COMPLETED"] },
        },
      },
    }),
  });

  const ordersData = await ordersResponse.json();
  if (!ordersResponse.ok) {
    return NextResponse.json({ error: ordersData.errors?.[0]?.detail || "Square error" }, { status: 400 });
  }

  const orders = ordersData.orders || [];
  if (!orders.length) {
    return NextResponse.json({ success: true, message: "No orders found", count: 0 });
  }

  // Get all catalog items to match brand names
  const catalogResponse = await fetch("https://connect.squareup.com/v2/catalog/list?types=ITEM", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Square-Version": "2024-01-18",
    },
  });
  const catalogData = await catalogResponse.json();
  const catalogItems = catalogData.objects || [];

  // Get brand inventory from Supabase to match items to brands
  const { data: inventory } = await supabase
    .from("brand_products")
    .select("*, brand_product_variations(*)")
    .eq("event", event);

  let salesInserted = 0;

  for (const order of orders) {
    const orderDate = order.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
    const lineItems = order.line_items || [];

    for (const lineItem of lineItems) {
      const catalogObjectId = lineItem.catalog_object_id;
      const quantity = parseInt(lineItem.quantity || "1");
      const unitPrice = Number(lineItem.base_price_money?.amount || 0) / 100;
      const totalRevenue = unitPrice * quantity;
      const itemName = lineItem.name || "";

      // Find which brand this item belongs to
      let brandEmail = "";
      let brandName = "";
      let productName = itemName;
      let variationName = lineItem.variation_name || "";

      // Match by catalog ID or name pattern "BrandName — ProductName"
      if (itemName.includes(" — ")) {
        const parts = itemName.split(" — ");
        brandName = parts[0].trim();
        productName = parts.slice(1).join(" — ").trim();

        // Find brand email from inventory
        const brandProduct = inventory?.find(p => p.brand_name === brandName);
        if (brandProduct) brandEmail = brandProduct.brand_email;
      }

      if (!brandEmail) continue;

      // Check if this order line already exists
      const { data: existing } = await supabase
        .from("brand_sales")
        .select("id")
        .eq("square_order_id", order.id)
        .eq("product_name", productName)
        .maybeSingle();

      if (existing) continue;

      await supabase.from("brand_sales").insert({
        event,
        brand_email: brandEmail,
        brand_name: brandName,
        product_name: productName,
        variation_name: variationName,
        quantity_sold: quantity,
        unit_price: unitPrice,
        total_revenue: totalRevenue,
        sale_date: orderDate,
        square_order_id: order.id,
      });

      salesInserted++;
    }
  }

  // Update payout calculations for each brand
  const { data: allBrands } = await supabase
    .from("brand_sales")
    .select("brand_email, brand_name, total_revenue")
    .eq("event", event);

  if (allBrands) {
    const brandTotals: Record<string, { email: string; name: string; revenue: number }> = {};
    allBrands.forEach(sale => {
      if (!brandTotals[sale.brand_email]) {
        brandTotals[sale.brand_email] = { email: sale.brand_email, name: sale.brand_name, revenue: 0 };
      }
      brandTotals[sale.brand_email].revenue += Number(sale.total_revenue);
    });

    for (const [email, data] of Object.entries(brandTotals)) {
      const commissionRate = 20;
      const commissionAmount = data.revenue * (commissionRate / 100);
      const payoutAmount = data.revenue - commissionAmount;

      await supabase.from("event_payouts").upsert({
        event,
        brand_email: email,
        brand_name: data.name,
        total_revenue: data.revenue,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        payout_amount: payoutAmount,
        payout_status: "pending",
      }, { onConflict: "event,brand_email" });
    }
  }

  return NextResponse.json({ success: true, orders_processed: orders.length, sales_inserted: salesInserted });
}
