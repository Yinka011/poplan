"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import { useParams } from "next/navigation";
import Link from "next/link";
import InventorySkeleton from "./InventorySkeleton";

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
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const params = useParams();
  const slug = params.slug as string;
  const event = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const loadKey = `${slug}:${organizerEmail}`;

  const [reviewTab, setReviewTab] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [reviewNote, setReviewNote] = useState("");
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(
    new Set(),
  );
  const toggleBrand = (b: string) =>
    setCollapsedBrands((prev) => {
      const n = new Set(prev);
      n.has(b) ? n.delete(b) : n.add(b);
      return n;
    });

  const exportBrandCSV = (bName: string) => {
    const bProducts = filtered.filter((p) => p.brand_name === bName);
    const rows: string[][] = [
      [
        "Brand",
        "Product",
        "Category",
        "Size",
        "Colour",
        "Quantity",
        "Price",
        "Photo URL",
      ],
    ];
    bProducts.forEach((p) => {
      if (p.variations.length > 0) {
        p.variations.forEach((v) => {
          rows.push([
            bName,
            p.name,
            p.category,
            v.size || "",
            v.colour || "",
            String(v.quantity),
            String(v.price || p.base_price),
            p.photo_url || "",
          ]);
        });
      } else {
        rows.push([
          bName,
          p.name,
          p.category,
          "",
          "",
          "",
          String(p.base_price),
          p.photo_url || "",
        ]);
      }
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${bName.replace(/\s+/g, "-")}-inventory.csv`;
    a.click();
  };

  const exportAllCSV = () => {
    try {
    const rows: string[][] = [
      [
        "Brand",
        "Product",
        "Category",
        "Size",
        "Colour",
        "Quantity",
        "Price",
        "Photo URL",
      ],
    ];
    filtered.forEach((p) => {
      if (p.variations.length > 0) {
        p.variations.forEach((v) => {
          rows.push([
            p.brand_name,
            p.name,
            p.category,
            v.size || "",
            v.colour || "",
            String(v.quantity),
            String(v.price || p.base_price),
            p.photo_url || "",
          ]);
        });
      } else {
        rows.push([
          p.brand_name,
          p.name,
          p.category,
          "",
          "",
          "",
          String(p.base_price),
          p.photo_url || "",
        ]);
      }
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-full-inventory.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
    } catch (error) {
      console.error("Failed to export inventory:", error);
      alert("Could not export inventory. Please try again.");
    }
  };
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [reviewingProduct, setReviewingProduct] = useState<number | null>(null);
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [savingProduct, setSavingProduct] = useState<number | null>(null);
  const [savingAction, setSavingAction] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    const fetchInventory = async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (!organizerEmail) throw new Error("Please sign in to view inventory.");
        const { data: productsData, error: productsError } = await supabase
          .from("brand_products")
          .select("*")
          .ilike("event", slug)
          .eq("organizer_email", organizerEmail)
          .order("brand_name");
        if (productsError) throw productsError;
        const items = productsData ?? [];
        let variations: Variation[] = [];
        if (items.length) {
          const { data, error } = await supabase
            .from("brand_product_variations")
            .select("*")
            .in("product_id", items.map((p) => p.id));
          if (error) throw error;
          variations = data ?? [];
        }
        if (!active) return;
        setProducts(items.map((p) => ({
          ...p,
          variations: variations.filter((v) => v.product_id === p.id),
        })));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load inventory:", error);
        setLoadError(error instanceof Error && error.message === "Please sign in to view inventory." ? error.message : "Could not load inventory. Please try again.");
      } finally {
        if (active) {
          setLoadedFor(loadKey);
          setLoading(false);
        }
      }
    };
    void fetchInventory();
    return () => { active = false; };
  }, [slug, event, organizerEmail, organizerLoading, loadKey, retry]);

  const brands = [...new Set(products.map((p) => p.brand_name))].sort();
  const categories = [...new Set(products.map((p) => p.category))].sort();

  const filtered = products.filter((p) => {
    if (brandFilter !== "all" && p.brand_name !== brandFilter) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    if (query && ![p.name, p.brand_name, p.category, ...p.variations.flatMap((v) => [v.size, v.colour])].some((value) => value?.toLocaleLowerCase().includes(query))) return false;
    return true;
  });

  const totalUnits = filtered.reduce(
    (s, p) => s + p.variations.reduce((vs, v) => vs + v.quantity, 0),
    0,
  );
  const totalValue = filtered.reduce(
    (s, p) =>
      s +
      p.variations.reduce(
        (vs, v) => vs + (v.price || p.base_price) * v.quantity,
        0,
      ),
    0,
  );
  const inSquare = filtered.filter((p) => p.square_catalog_id).length;

  const brandSummary = brands.filter((brand) => filtered.some((p) => p.brand_name === brand)).map((brand) => {
    const brandProducts = filtered.filter((p) => p.brand_name === brand);
    const units = brandProducts.reduce(
      (s, p) => s + p.variations.reduce((vs, v) => vs + v.quantity, 0),
      0,
    );
    const value = brandProducts.reduce(
      (s, p) =>
        s +
        p.variations.reduce(
          (vs, v) => vs + (v.price || p.base_price) * v.quantity,
          0,
        ),
      0,
    );
    const uploaded = brandProducts.filter((p) => p.square_catalog_id).length;
    return {
      brand,
      products: brandProducts.length,
      units,
      value,
      uploaded,
      total: brandProducts.length,
    };
  });

  const uploadProductToSquare = async (product: Product): Promise<void> => {
    const res = await fetch("/api/square/upload-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: product.brand_name,
        brandEmail: product.brand_email || "",
        items: [{
          name: product.name,
          base_price: product.base_price,
          category: product.category,
          photo_url: product.photo_url || "",
          variations: product.variations,
        }],
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || "Square upload failed.");

    setProducts((prev) => prev.map((p) =>
      p.id === product.id ? { ...p, square_catalog_id: "uploaded" } : p,
    ));
    const { error } = await supabase
      .from("brand_products")
      .update({ square_catalog_id: "uploaded" })
      .eq("id", product.id)
      .select("id")
      .single();
    if (error) {
      console.error("Failed to record Square upload:", error);
      throw new Error("Uploaded to Square, but the upload status could not be saved. Check Square before retrying to avoid duplicates.");
    }
  };

  const uploadAllApprovedToSquare = async () => {
    if (bulkUploading || savingProduct !== null) return;
    const toUpload = products.filter(
      (p) => p.review_status === "approved" && !p.square_catalog_id,
    );
    if (toUpload.length === 0) {
      alert("All approved products are already in Square.");
      return;
    }
    if (!confirm(`Upload ${toUpload.length} approved products to Square?`))
      return;
    setBulkUploading(true);
    setBulkProgress(0);
    let uploaded = 0;
    const failures: string[] = [];
    try {
      for (const [index, product] of toUpload.entries()) {
        try {
          await uploadProductToSquare(product);
          uploaded++;
        } catch (error) {
          console.error("Square upload failed for product:", product.id, error);
          failures.push(`${product.name}: ${error instanceof Error ? error.message : "Upload failed."}`);
        }
        setBulkProgress(Math.round(((index + 1) / toUpload.length) * 100));
      }
      if (failures.length) {
        alert(`${uploaded} of ${toUpload.length} products uploaded and recorded.\n${failures.join("\n")}\nCheck Square before retrying failed uploads to avoid duplicates.`);
      } else {
        alert(`Done! ${uploaded} products uploaded to Square.`);
      }
    } finally {
      setBulkUploading(false);
    }
  };

  const approveProduct = async (productId: number) => {
    if (bulkUploading || savingProduct !== null) return;
    const product = products.find((p) => p.id === productId);
    if (!product) {
      alert("Could not find this product. Please refresh and try again.");
      return;
    }
    setSavingProduct(productId);
    setSavingAction("approve");
    try {
      const { error } = await supabase
        .from("brand_products")
        .update({ review_status: "approved", review_note: "" })
        .eq("id", productId)
        .select("id")
        .single();
      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, review_status: "approved", review_note: "" }
            : p,
        ),
      );
      if (reviewingProduct === productId) {
        setReviewingProduct(null);
        setReviewNote("");
      }
      try {
        if (!product.square_catalog_id) await uploadProductToSquare(product);
      } catch (error) {
        console.error("Square upload failed:", error);
        alert(`Product approved, but the Square upload did not complete: ${error instanceof Error ? error.message : "Upload failed."} Check Square before retrying to avoid duplicates.`);
      }
    } catch (error) {
      console.error("Failed to approve product:", error);
      alert("Could not approve product. Please try again.");
    } finally {
      setSavingProduct(null);
      setSavingAction(null);
    }
  };

  const rejectProduct = async (productId: number) => {
    if (bulkUploading || savingProduct !== null) return;
    setSavingProduct(productId);
    setSavingAction("reject");
    try {
      const { error } = await supabase
        .from("brand_products")
        .update({ review_status: "rejected", review_note: reviewNote })
        .eq("id", productId)
        .select("id")
        .single();
      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, review_status: "rejected", review_note: reviewNote }
            : p,
        ),
      );
      setReviewingProduct(null);
      setReviewNote("");
    } catch (error) {
      console.error("Failed to reject product:", error);
      alert("Could not reject product. Please try again.");
    } finally {
      setSavingProduct(null);
      setSavingAction(null);
    }
  };

  return (
    <div className="[overflow-wrap:anywhere]" style={{ minHeight: "100vh", background: "#f8faf8" }}>
      <div
        style={{
          background: "#1B3A2D",
          padding: "1rem 2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <Link
          href={`/organizer/events/${slug}`}
          style={{
            fontSize: "0.8rem",
            color: "#E8C97A",
            textDecoration: "none",
          }}
        >
          ← Back to event
        </Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>
          Inventory — {event}
        </div>
      </div>

      <div
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        <LoadingView loading={organizerLoading || loading || loadedFor !== loadKey} error={loadError} onRetry={() => setRetry((value) => value + 1)} customLoader={<InventorySkeleton />}>
        {savingAction === "approve" && <div role="status" style={{ marginBottom: "1rem", color: "#4a5a52" }}>Approving product and uploading to Square...</div>}
        {/* Summary stats */}
        <div
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          style={{
            marginBottom: "1.5rem",
          }}
        >
          {[
            { label: "PRODUCTS", value: filtered.length },
            { label: "TOTAL UNITS", value: totalUnits },
            { label: "TOTAL VALUE", value: formatCurrency(totalValue) },
            { label: "IN SQUARE", value: `${inSquare}/${filtered.length}` },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1rem",
                border: "1px solid #e4ebe6",
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  fontSize: "1.6rem",
                  color: "#1B3A2D",
                  fontWeight: "normal",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "#4a5a52",
                  letterSpacing: "0.12em",
                  marginTop: "4px",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Review tabs */}
        {filtered.filter((p) => p.review_status === "pending").length > 0 && (
          <div
            style={{
              background: "#E8C97A22",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              border: "1px solid #E8C97A44",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "#b87333",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              ⏳ PENDING REVIEW (
              {filtered.filter((p) => p.review_status === "pending").length})
            </div>
            {filtered
              .filter((p) => p.review_status === "pending")
              .map((product) => (
                <div
                  key={product.id}
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    marginBottom: "8px",
                    border: "1px solid #e4ebe6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>
                        {product.brand_name} · {product.category} ·{" "}
                        {formatCurrency(Number(product.base_price))}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#4a5a52",
                          marginTop: "2px",
                        }}
                      >
                        {product.variations.length} variation
                        {product.variations.length !== 1 ? "s" : ""} ·{" "}
                        {product.variations.reduce((s, v) => s + v.quantity, 0)}{" "}
                        units
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {product.photo_url && (
                        <img
                          src={product.photo_url}
                          alt={product.name}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "6px",
                            objectFit: "cover",
                          }}
                        />
                      )}
                      <button
                        onClick={() => approveProduct(product.id)}
                        disabled={bulkUploading || savingProduct !== null}
                        style={{
                          padding: "5px 12px",
                          background: "#4a7c59",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        {savingProduct === product.id && savingAction === "approve" ? "Approving..." : "✓ Approve"}
                      </button>
                      <button
                        disabled={bulkUploading || savingProduct !== null}
                        onClick={() =>
                          setReviewingProduct(
                            reviewingProduct === product.id ? null : product.id,
                          )
                        }
                        style={{
                          padding: "5px 12px",
                          background: "#c0392b",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                  {reviewingProduct === product.id && (
                    <div
                      style={{ marginTop: "8px", display: "flex", gap: "8px" }}
                    >
                      <input
                        disabled={bulkUploading || savingProduct !== null}
                        placeholder="Reason for rejection..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "6px 10px",
                          border: "1px solid #c0392b",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => rejectProduct(product.id)}
                        disabled={bulkUploading || savingProduct !== null}
                        style={{
                          padding: "6px 12px",
                          background: "#c0392b",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        {savingProduct === product.id && savingAction === "reject" ? "Saving..." : "Confirm"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Bulk upload button */}
        {products.filter(
          (p) => p.review_status === "approved" && !p.square_catalog_id,
        ).length > 0 && (
          <div
            style={{
              background: "#E8C97A22",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              border: "1px solid #E8C97A44",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>
                {
                  products.filter(
                    (p) =>
                      p.review_status === "approved" && !p.square_catalog_id,
                  ).length
                }{" "}
                approved products not yet in Square
              </div>
              {bulkUploading && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#4a5a52",
                    marginTop: "2px",
                  }}
                >
                  Uploading... {bulkProgress}%
                </div>
              )}
            </div>
            <button
              onClick={uploadAllApprovedToSquare}
              disabled={bulkUploading || savingProduct !== null}
              style={{
                padding: "8px 16px",
                background: "#1B3A2D",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              {bulkUploading
                ? `Uploading ${bulkProgress}%...`
                : "↑ Upload all to Square"}
            </button>
          </div>
        )}

        {/* Export all */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <button
            onClick={exportAllCSV}
            style={{
              padding: "7px 14px",
              background: "#fff",
              color: "#1B3A2D",
              border: "1px solid #e4ebe6",
              borderRadius: "8px",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            ↓ Export all CSV
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "1.5rem",
            flexWrap: "wrap" as const,
          }}
        >
          <input
            type="search"
            aria-label="Search inventory"
            placeholder="Search products, brands, categories or variations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #e4ebe6",
              borderRadius: "8px",
              fontSize: "0.85rem",
              background: "#fff",
              flex: "1 1 260px",
              minWidth: 0,
            }}
          />
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #e4ebe6",
              borderRadius: "8px",
              fontSize: "0.85rem",
              background: "#fff",
              maxWidth: "100%",
            }}
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #e4ebe6",
              borderRadius: "8px",
              fontSize: "0.85rem",
              background: "#fff",
              maxWidth: "100%",
            }}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Brand summary cards */}
        {brandFilter === "all" && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#4a5a52",
                letterSpacing: "0.12em",
                marginBottom: "8px",
              }}
            >
              BRAND SUMMARY
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
                gap: "8px",
              }}
            >
              {brandSummary.map((b) => (
                <div
                  key={b.brand}
                  onClick={() => setBrandFilter(b.brand)}
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e4ebe6",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#1B3A2D")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#e4ebe6")
                  }
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#1B3A2D",
                      marginBottom: "4px",
                    }}
                  >
                    {b.brand}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      fontSize: "0.72rem",
                      color: "#4a5a52",
                    }}
                  >
                    <span>{b.products} products</span>
                    <span>{b.units} units</span>
                    <span>{formatCurrency(b.value)}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: b.uploaded === b.total ? "#4a7c59" : "#b87333",
                      marginTop: "4px",
                    }}
                  >
                    {b.uploaded === b.total
                      ? "✓ All in Square"
                      : `${b.uploaded}/${b.total} in Square`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full inventory table */}
        {filtered.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "4rem",
              textAlign: "center",
              border: "1px solid #e4ebe6",
            }}
          >
            <div
              style={{
                fontSize: "1rem",
                color: "#1B3A2D",
                marginBottom: "0.5rem",
              }}
            >
              {products.length === 0 ? "No inventory yet" : "No matching inventory"}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
              {products.length === 0 ? "Brands will appear here once they add products to their portal." : "Try a different search or filter."}
            </div>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Inventory"
            tabIndex={0}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e4ebe6",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "40px minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 1fr) repeat(4, minmax(0, 0.8fr))",
                minWidth: "740px",
                padding: "10px 16px",
                background: "#faf8f5",
                fontSize: "0.65rem",
                color: "#4a5a52",
                letterSpacing: "0.08em",
              }}
            >
              <div></div>
              <div>BRAND</div>
              <div>PRODUCT</div>
              <div>CATEGORY</div>
              <div>SIZE</div>
              <div>COLOUR</div>
              <div>QTY</div>
              <div>PRICE</div>
            </div>
            {filtered.flatMap((product) =>
              product.variations.length > 0 ? (
                product.variations.map((v, vi) => (
                  <div
                    key={`${product.id}-${v.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "40px minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 1fr) repeat(4, minmax(0, 0.8fr))",
                      minWidth: "740px",
                      padding: "10px 16px",
                      borderTop: "1px solid #f0ece6",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      {product.photo_url && vi === 0 && (
                        <img
                          src={product.photo_url}
                          alt={product.name}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "4px",
                            objectFit: "cover",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: vi === 0 ? "#1B3A2D" : "#4a5a52",
                      }}
                    >
                      {vi === 0 ? product.brand_name : ""}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>
                        {vi === 0 ? product.name : ""}
                      </div>
                      {vi === 0 && product.square_catalog_id && (
                        <div style={{ fontSize: "0.65rem", color: "#4a7c59" }}>
                          ✓ In Square
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                      {vi === 0 ? product.category : ""}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>
                      {v.size || "—"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>
                      {v.colour || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: v.quantity < 3 ? "#c0392b" : "#1c1714",
                        fontWeight: v.quantity < 3 ? 600 : "normal",
                      }}
                    >
                      {v.quantity}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>
                      {v.price == null ? "—" : formatCurrency(Number(v.price))}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  key={product.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "40px minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 1fr) repeat(4, minmax(0, 0.8fr))",
                    minWidth: "740px",
                    padding: "10px 16px",
                    borderTop: "1px solid #f0ece6",
                    alignItems: "center",
                  }}
                >
                  <div>
                    {product.photo_url && (
                      <img
                        src={product.photo_url}
                        alt={product.name}
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "4px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>
                    {product.brand_name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                    {product.category}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                    No variations added
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                    No variations added
                  </div>
                </div>
              ),
            )}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e4ebe6",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "space-between",
                background: "#faf8f5",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#4a5a52" }}>
                {filtered.length} products · {totalUnits} units
              </span>
              <span style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>
                Total value: {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        )}
        </LoadingView>
      </div>
    </div>
  );
}
