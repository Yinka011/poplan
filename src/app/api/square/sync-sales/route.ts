import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SkippedSale = {
  order_id: string;
  line_item_id?: string;
  item_name?: string;
  variation_name?: string;
  reason: string;
};

export async function POST(request: Request) {
  const { event, start_date, end_date, organizer_email } = await request.json();

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (!accessToken || !locationId) {
    return NextResponse.json({ error: "Square not configured" }, { status: 500 });
  }

  if (!start_date || !end_date) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
  }
  if (typeof organizer_email !== "string" || !organizer_email.trim()) {
    return NextResponse.json({ error: "organizer_email is required to match inventory" }, { status: 400 });
  }
  const startAt = new Date(start_date).toISOString();
  const endAt = new Date(end_date + "T23:59:59").toISOString();

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
    return NextResponse.json({ success: true, message: "No orders found", count: 0, orders_processed: 0, sales_inserted: 0, skipped: [] });
  }

  // Fetch refunds for the date range so we can skip refunded items
  const refundsResponse = await fetch("https://connect.squareup.com/v2/refunds?" + new URLSearchParams({
    begin_time: startAt,
    end_time: endAt,
    location_id: locationId,
  }), {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Square-Version": "2024-01-18",
    },
  });
  const refundsData = await refundsResponse.json();
  if (!refundsResponse.ok) {
    console.error("Could not fetch Square refunds:", refundsData.errors);
    return NextResponse.json({ error: "Could not fetch Square refunds. No sales were processed." }, { status: 502 });
  }
  // Build a set of refunded order IDs for quick lookup
  const refundedOrderIds = new Set<string>(
    (refundsData.refunds || []).map((r: any) => r.order_id)
  );

  // Look up inventory across all event slug variants (e.g. "atlanta" and "atlanta-1795088699794")
  const { data: inventory, error: inventoryError } = await supabase
    .from("brand_products")
    .select("*, brand_product_variations(*)")
    .eq("organizer_email", organizer_email);
  if (inventoryError) {
    console.error("Could not load inventory for Square sync:", inventoryError);
    return NextResponse.json({ error: "Could not load inventory. No sales were processed." }, { status: 500 });
  }

  let salesInserted = 0;
  const skipped: SkippedSale[] = [];
  const brandTaxMap: Record<string, number> = {};

  for (const order of orders) {
    // Skip entire order if it was refunded
    if (refundedOrderIds.has(order.id)) {
      skipped.push({ order_id: order.id, reason: "Order has a refund." });
      continue;
    }

    const orderDate = order.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
    const lineItems = order.line_items || [];
    if (!lineItems.length) {
      skipped.push({ order_id: order.id, reason: "Order has no line items." });
      continue;
    }
    const orderTotalTax = Number(order.total_tax_money?.amount || 0) / 100;
    const orderTotalMoney = Number(order.total_money?.amount || 0) / 100;

    for (const lineItem of lineItems) {
      const skippedItem = {
        order_id: order.id,
        line_item_id: lineItem.uid,
        item_name: lineItem.name || "",
        variation_name: lineItem.variation_name || "",
      };
      const quantity = parseInt(lineItem.quantity || "1");
      const unitPrice = Number(lineItem.base_price_money?.amount || 0) / 100;
      const grossSales = Number((lineItem as any).gross_sales_money?.amount || 0) / 100;
      if (grossSales === 0) {
        skipped.push({ ...skippedItem, reason: "Line item gross sales are missing or zero." });
        continue;
      }

      const totalRevenue = grossSales || (unitPrice * quantity);
      const itemName = lineItem.name || "";

      let brandEmail = "";
      let brandName = "";
      let productName = itemName;
      const variationName = lineItem.variation_name || "";

      // Build dynamic brand name set from inventory
      const inventoryBrandNames = [...new Set((inventory || []).map((p: any) => p.brand_name?.trim()).filter(Boolean))];

      // Try "BrandName — Product" format first
      if (itemName.includes(" — ")) {
        const parts = itemName.split(" — ");
        const candidateBrand = parts[0].trim().replace(/\s+/g, " ");
        const candidateProduct = parts.slice(1).join(" — ").trim();
        if (candidateProduct.length > 0 && inventoryBrandNames.some((b: string) => b.toLowerCase() === candidateBrand.toLowerCase())) {
          brandName = candidateBrand;
          productName = candidateProduct;
          const brandProduct = inventory?.find((p: any) => p.brand_name?.trim().toLowerCase() === brandName.toLowerCase());
          if (brandProduct) brandEmail = brandProduct.brand_email;
        }
      }

      // Dynamic product→brand lookup from inventory
      if (!brandName) {
        const matched = inventory?.find((p: any) =>
          p.name?.trim().toLowerCase() === itemName.trim().toLowerCase()
        );
        if (matched) {
          brandName = matched.brand_name;
          brandEmail = matched.brand_email;
          productName = matched.name;
        }
      }

      // Fallback hardcoded map for products not in Nalpop inventory
      const manualMap: Record<string, string> = {
        "cladini top": "Cladini",
        "athena pant & shirt (black)": "Cladini",
        "havillah bubu (blue neckline)": "Cladini",
        "limited bubu": "Cladini",
        "mari bubu": "Cladini",
        "slip dress": "Cladini",
        "tessa top": "Ciscacecil",
        "tessa - custom": "Ciscacecil",
        "taselle top": "Ciscacecil",
        "taselle skirt": "Ciscacecil",
        "palm top": "Ciscacecil",
        "saffra midi skirt": "Ciscacecil",
        "saffra mini skirt": "Ciscacecil",
        "zaya pant": "Ciscacecil",
        "zaya top": "Ciscacecil",
        "amber top": "Ciscacecil",
        "beaded tank top": "Ciscacecil",
        "north dress": "Jayda Woman",
        "low back linen kaftan": "Jayda Woman",
        "j3- daffodil skirt set": "Jayda Woman",
        "poppy": "Jayda Woman",
        "jayda mesh top": "Jayda Woman",
        "lolu tennis skirt": "Isaleekofromderin",
        "l4 -  ara beaded summer dress": "Ara Lagos",
        "l4 - ara beaded summer dress": "Ara Lagos",
        "l12 - dele black and white short sleeved set": "Ara Lagos",
        "l15 - elana beaded kaftan green": "Ara Lagos",
        "l23 - olanna aso oke pants vintage (blue/crem/gold mix)": "Ara Lagos",
        "l23 - olanna aso oke pants vintage": "Ara Lagos",
        "l29 - onjawu aso oke trousers (red)": "Ara Lagos",
        "l45 - tolani cotton brush work purple jumpsuit": "Ara Lagos",
        "yinkamb yago": "Yinka MB",
      };

      if (!brandName) {
        const mapped = manualMap[itemName.toLowerCase().trim()];
        if (mapped) {
          brandName = mapped;
          productName = itemName;
        }
      }

      if (!brandEmail) {
        const brandProduct = inventory?.find(p => p.brand_name?.trim().toLowerCase() === brandName.toLowerCase());
        if (brandProduct) brandEmail = brandProduct.brand_email;
      }

      if (!brandEmail) {
        console.log("SKIPPED - no brand match:", { itemName, variationName, inventoryBrandNames, inventoryCount: inventory?.length });
        skipped.push({
          ...skippedItem,
          reason: brandName
            ? `No inventory record with an email matched brand "${brandName}" for this organizer.`
            : "Item name did not match an inventory product, inventory brand, or manual product mapping.",
        });
        continue;
      }

      if (orderTotalMoney > 0 && orderTotalTax > 0) {
        const lineShare = totalRevenue / orderTotalMoney;
        brandTaxMap[brandEmail] = (brandTaxMap[brandEmail] || 0) + (orderTotalTax * lineShare);
      }

      const normalizedProduct = productName.trim().toLowerCase();
      const { data: existing, error: existingError } = await supabase
        .from("brand_sales")
        .select("id")
        .eq("square_order_id", order.id)
        .eq("brand_email", brandEmail)
        .ilike("product_name", normalizedProduct)
        .maybeSingle();

      if (existingError) {
        console.error("Could not check existing Square sale:", existingError);
        return NextResponse.json({ error: "Could not check for an existing sale. Sync stopped; some sales may already have been inserted.", failed_item: skippedItem, sales_inserted: salesInserted, skipped }, { status: 500 });
      }
      if (existing) {
        skipped.push({ ...skippedItem, reason: "A sale for this order, brand, and product already exists." });
        continue;
      }

      const { error: insertError } = await supabase.from("brand_sales").insert({
        event,
        brand_email: brandEmail,
        brand_name: brandName,
        product_name: productName.trim(),
        variation_name: variationName,
        quantity_sold: quantity,
        unit_price: unitPrice,
        total_revenue: totalRevenue,
        sale_date: orderDate,
        square_order_id: order.id,
        organizer_email,
      });

      if (insertError) {
        console.error("Could not insert Square sale:", insertError);
        return NextResponse.json({ error: "Could not insert a sale. Sync stopped; some sales may already have been inserted.", failed_item: skippedItem, sales_inserted: salesInserted, skipped }, { status: 500 });
      }
      salesInserted++;
    }
  }

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
      const netSales = data.revenue;
      const tax = brandTaxMap[email] || 0;
      const processingFee = 0.0271 * (netSales + tax);
      const commissionAmount = (netSales - processingFee) * 0.20;
      const payoutAmount = netSales - processingFee - commissionAmount;

      await supabase.from("event_payouts").delete().eq("event", event).eq("brand_email", email);
      await supabase.from("event_payouts").insert({
        event,
        brand_email: email,
        brand_name: data.name,
        total_revenue: netSales,
        commission_rate: 20,
        commission_amount: Math.round(commissionAmount * 100) / 100,
        payout_amount: Math.round(payoutAmount * 100) / 100,
        payout_status: "pending",
        organizer_email,
      });
    }
  }

  return NextResponse.json({ success: true, orders_processed: orders.length, sales_inserted: salesInserted, skipped });
}
