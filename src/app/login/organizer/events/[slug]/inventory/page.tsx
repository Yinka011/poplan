"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type Variation = {
  id: number;
  product_id: number;
  size: string;
  colour: string;
  quantity: number;
  price: number;
  square_variation_id?: string;
};

type Product = {
  id: number;
  brand_email: string;
  brand_name: string;
  name: string;
  category: string;
  base_price: number;
  photo_url?: string;
  square_catalog_id?: string;
  review_status?: string;
  review_note?: string;
  variations: Variation[];
};

export default function InventoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const event = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTab, setReviewTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [reviewNote, setReviewNote] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [reviewingProduct, setReviewingProduct] = useState<number | null>(null);
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => { fetchInventory(); }, [slug]);

  const fetchInventory = async () => {
    const { data: productsData } = await supabase
      .from("brand_products")
      .select("*")
      .eq("event", event)
      .order("brand_name");

    if (!productsData) { setLoading(false); return; }

    const { data: variationsData } = await supabase
      .from("brand_product_variations")
      .select("*")
      .in("product_id", productsData.map(p => p.id));

    const productsWithVariations = productsData.map(p => ({
      ...p,
      variations: variationsData?.filter(v => v.product_id === p.id) || [],
    }));

    setProducts(productsWithVariations);
    setLoading(false);
  };

  const brands = [...new Set(products.map(p => p.brand_name))].sort();
  const categories = [...new Set(products.map(p => p.category))].sort();

  const filtered = products.filter(p => {
    if (brandFilter !== "all" && p.brand_name !== brandFilter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    return true;
  });

  const totalUnits = filtered.reduce((s, p) => s + p.variations.reduce((vs, v) => vs + v.quantity, 0), 0);
  const totalValue = filtered.reduce((s, p) => s + p.variations.reduce((vs, v) => vs + (v.price || p.base_price) * v.quantity, 0), 0);
  const inSquare = filtered.filter(p => p.square_catalog_id).length;

  const brandSummary = brands.map(brand => {
    const brandProducts = products.filter(p => p.brand_name === brand);
    const units = brandProducts.reduce((s, p) => s + p.variations.reduce((vs, v) => vs + v.quantity, 0), 0);
    const value = brandProducts.reduce((s, p) => s + p.variations.reduce((vs, v) => vs + (v.price || p.base_price) * v.quantity, 0), 0);
    const uploaded = brandProducts.filter(p => p.square_catalog_id).length;
    return { brand, products: brandProducts.length, units, value, uploaded, total: brandProducts.length };
  });

  const uploadAllApprovedToSquare = async () => {
    const toUpload = products.filter(p => p.review_status === "approved" && !p.square_catalog_id);
    if (toUpload.length === 0) { alert("All approved products are already in Square."); return; }
    if (!confirm(`Upload ${toUpload.length} approved products to Square?`)) return;
    setBulkUploading(true);
    setBulkProgress(0);
    let done = 0;
    for (const product of toUpload) {
      try {
        const variations = product.variations.map(v => ({
          size: v.size, colour: v.colour, quantity: v.quantity, price: v.price || product.base_price
        }));
        const res = await fetch("/api/square/upload-inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: product.name, category: product.category, basePrice: product.base_price, brandName: product.brand_name, variations, productId: product.id }),
        });
        if (res.ok) {
          await supabase.from("brand_products").update({ square_catalog_id: "uploaded" }).eq("id", product.id);
          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, square_catalog_id: "uploaded" } : p));
        }
      } catch (e) { console.log("Failed for", product.name, e); }
      done++;
      setBulkProgress(Math.round((done / toUpload.length) * 100));
    }
    setBulkUploading(false);
    alert(`Done! ${done} products uploaded to Square.`);
  };

  const approveProduct = async (productId: number) => {
    await supabase.from("brand_products").update({ review_status: "approved", review_note: "" }).eq("id", productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, review_status: "approved", review_note: "" } : p));
    // Upload to Square using the same endpoint as brand portal
    const product = products.find(p => p.id === productId);
    if (product) {
      try {
        const variations = product.variations.map(v => ({
          size: v.size, colour: v.colour, quantity: v.quantity, price: v.price || product.base_price
        }));
        const res = await fetch("/api/square/upload-inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            category: product.category,
            basePrice: product.base_price,
            brandName: product.brand_name,
            variations,
            productId,
          }),
        });
        if (res.ok) {
          await supabase.from("brand_products").update({ square_catalog_id: "uploaded" }).eq("id", productId);
          setProducts(prev => prev.map(p => p.id === productId ? { ...p, square_catalog_id: "uploaded" } : p));
        }
      } catch (e) { console.log("Square upload failed", e); }
    }
  };

  const rejectProduct = async (productId: number) => {
    await supabase.from("brand_products").update({ review_status: "rejected", review_note: reviewNote }).eq("id", productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, review_status: "rejected", review_note: reviewNote } : p));
    setReviewingProduct(null);
    setReviewNote("");
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading inventory...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back to event</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Inventory — {event}</div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "PRODUCTS", value: filtered.length },
            { label: "TOTAL UNITS", value: totalUnits },
            { label: "TOTAL VALUE", value: `$${totalValue.toFixed(0)}` },
            { label: "IN SQUARE", value: `${inSquare}/${filtered.length}` },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
              <div style={{ fontSize: "1.6rem", color: "#1B3A2D", fontWeight: "normal" }}>{stat.value}</div>
              <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.12em", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Review tabs */}
        {products.filter(p => p.review_status === "pending").length > 0 && (
          <div style={{ background: "#E8C97A22", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.5rem", border: "1px solid #E8C97A44" }}>
            <div style={{ fontSize: "0.72rem", color: "#b87333", letterSpacing: "0.1em", marginBottom: "8px" }}>⏳ PENDING REVIEW ({products.filter(p => p.review_status === "pending").length})</div>
            {products.filter(p => p.review_status === "pending").map(product => (
              <div key={product.id} style={{ background: "#fff", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "8px", border: "1px solid #e4ebe6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{product.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{product.brand_name} · {product.category} · ${Number(product.base_price).toFixed(2)}</div>
                    <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginTop: "2px" }}>{product.variations.length} variation{product.variations.length !== 1 ? "s" : ""} · {product.variations.reduce((s, v) => s + v.quantity, 0)} units</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {product.photo_url && <img src={product.photo_url} alt={product.name} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} />}
                    <button onClick={() => approveProduct(product.id)} style={{ padding: "5px 12px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>✓ Approve</button>
                    <button onClick={() => setReviewingProduct(reviewingProduct === product.id ? null : product.id)} style={{ padding: "5px 12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>✕ Reject</button>
                  </div>
                </div>
                {reviewingProduct === product.id && (
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                    <input placeholder="Reason for rejection..." value={reviewNote} onChange={e => setReviewNote(e.target.value)} style={{ flex: 1, padding: "6px 10px", border: "1px solid #c0392b", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} autoFocus />
                    <button onClick={() => rejectProduct(product.id)} style={{ padding: "6px 12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Confirm</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bulk upload button */}
        {products.filter(p => p.review_status === "approved" && !p.square_catalog_id).length > 0 && (
          <div style={{ background: "#E8C97A22", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.5rem", border: "1px solid #E8C97A44", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{products.filter(p => p.review_status === "approved" && !p.square_catalog_id).length} approved products not yet in Square</div>
              {bulkUploading && <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginTop: "2px" }}>Uploading... {bulkProgress}%</div>}
            </div>
            <button onClick={uploadAllApprovedToSquare} disabled={bulkUploading} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {bulkUploading ? `Uploading ${bulkProgress}%...` : "↑ Upload all to Square"}
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", background: "#fff" }}>
            <option value="all">All brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", background: "#fff" }}>
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Brand summary cards */}
        {brandFilter === "all" && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "8px" }}>BRAND SUMMARY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
              {brandSummary.map(b => (
                <div key={b.brand} onClick={() => setBrandFilter(b.brand)} style={{ background: "#fff", borderRadius: "10px", padding: "0.75rem 1rem", border: "1px solid #e4ebe6", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#1B3A2D")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e4ebe6")}>
                  <div style={{ fontSize: "0.85rem", color: "#1B3A2D", marginBottom: "4px" }}>{b.brand}</div>
                  <div style={{ display: "flex", gap: "12px", fontSize: "0.72rem", color: "#4a5a52" }}>
                    <span>{b.products} products</span>
                    <span>{b.units} units</span>
                    <span>${b.value.toFixed(0)}</span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: b.uploaded === b.total ? "#4a7c59" : "#b87333", marginTop: "4px" }}>
                    {b.uploaded === b.total ? "✓ All in Square" : `${b.uploaded}/${b.total} in Square`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full inventory table */}
        {filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "4rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No inventory yet</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Brands will appear here once they add products to their portal.</div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr", padding: "10px 16px", background: "#faf8f5", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em" }}>
              <div></div>
              <div>BRAND</div>
              <div>PRODUCT</div>
              <div>CATEGORY</div>
              <div>SIZE</div>
              <div>COLOUR</div>
              <div>QTY</div>
              <div>PRICE</div>
            </div>
            {filtered.flatMap(product =>
              product.variations.length > 0 ? product.variations.map((v, vi) => (
                <div key={`${product.id}-${v.id}`} style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr", padding: "10px 16px", borderTop: "1px solid #f0ece6", alignItems: "center" }}>
                  <div>
                    {product.photo_url && vi === 0 && (
                      <img src={product.photo_url} alt={product.name} style={{ width: "30px", height: "30px", borderRadius: "4px", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: vi === 0 ? "#1B3A2D" : "#4a5a52" }}>{vi === 0 ? product.brand_name : ""}</div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>{vi === 0 ? product.name : ""}</div>
                    {vi === 0 && product.square_catalog_id && <div style={{ fontSize: "0.65rem", color: "#4a7c59" }}>✓ In Square</div>}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{vi === 0 ? product.category : ""}</div>
                  <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>{v.size || "—"}</div>
                  <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>{v.colour || "—"}</div>
                  <div style={{ fontSize: "0.85rem", color: v.quantity < 3 ? "#c0392b" : "#1c1714", fontWeight: v.quantity < 3 ? 600 : "normal" }}>{v.quantity}</div>
                </div>
              )) : (
                <div key={product.id} style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr", padding: "10px 16px", borderTop: "1px solid #f0ece6", alignItems: "center" }}>
                  <div>{product.photo_url && <img src={product.photo_url} alt={product.name} style={{ width: "30px", height: "30px", borderRadius: "4px", objectFit: "cover" }} />}</div>
                  <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{product.brand_name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>{product.name}</div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{product.category}</div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>No variations added</div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>No variations added</div>
                </div>
              )
            )}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e4ebe6", display: "flex", justifyContent: "space-between", background: "#faf8f5" }}>
              <span style={{ fontSize: "0.8rem", color: "#4a5a52" }}>{filtered.length} products · {totalUnits} units</span>
              <span style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>Total value: ${totalValue.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
