/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { notifyOrganizer } from "@/lib/organizerNotify";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { folderSegment, uploadToCloudinary } from "@/lib/cloudinary";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import PageSkeleton from "@/components/shared/PageSkeleton";

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
  event: string;
  brand_email: string;
  brand_name: string;
  name: string;
  category: string;
  base_price: number;
  photo_url?: string;
  square_catalog_id?: string;
  review_status?: string;
  review_note?: string;
  variations?: Variation[];
};

const CATEGORIES = ["Clothing", "Accessories", "Shoes", "Bags", "Jewellery", "Beauty", "Home", "Other"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "One Size", "N/A", "Other"];
const COLOURS = ["Black", "White", "Beige", "Brown", "Camel", "Grey", "Navy", "Blue", "Green", "Red", "Pink", "Purple", "Orange", "Yellow", "Gold", "Silver", "Multi", "Other"];

type Props = {
  event: string;
  brandEmail: string;
  brandName: string;
};

export default function BrandInventory({ event, brandEmail, brandName }: Props) {
  return <BrandInventoryContent key={JSON.stringify([event, brandEmail])} event={event} brandEmail={brandEmail} brandName={brandName} />;
}

function BrandInventoryContent({ event, brandEmail, brandName }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState("");
  const actionRef = useRef(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingToSquare, setUploadingToSquare] = useState<number | null>(null);
  const [uploadingAllToSquare, setUploadingAllToSquare] = useState(false);
  const [addingVariation, setAddingVariation] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editingVariation, setEditingVariation] = useState<number | null>(null);
  const [editVariationData, setEditVariationData] = useState({ size: "", colour: "", quantity: "", price: "" });
  const [submitted, setSubmitted] = useState(false);
  const [editProductData, setEditProductData] = useState({ name: "", category: "Clothing", base_price: "" });
  const [newProduct, setNewProduct] = useState({ name: "", category: "Clothing", base_price: "", photo_url: "" });
  const [newVariation, setNewVariation] = useState({ size: "One Size", colour: "Black", quantity: "", price: "" });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
    setLoading(true);
    setLoadError("");
    try {
    const { data: productsData, error: productsError } = await supabase
      .from("brand_products")
      .select("*")
      .eq("event", event)
      .eq("brand_email", brandEmail)
      .order("created_at");

    if (productsError) throw productsError;
    if (!productsData?.length) {
      if (active) setProducts([]);
      return;
    }

    const { data: variationsData, error: variationsError } = await supabase
      .from("brand_product_variations")
      .select("*")
      .in("product_id", productsData.map((p: any) => p.id));

    if (variationsError) throw variationsError;
    const productsWithVariations = productsData.map((p: any) => ({
      ...p,
      variations: variationsData?.filter((v: any) => v.product_id === p.id) || [],
    }));

    if (active) setProducts(productsWithVariations);
    } catch (error) {
      console.error("Could not load inventory:", error);
      if (active) setLoadError("Could not load inventory. Please try again.");
    } finally {
      if (active) setLoading(false);
    }
    };
    void fetchProducts();
    return () => { active = false; };
  }, [event, brandEmail, retry]);

  const runAction = async (label: string, callback: () => Promise<void>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(label);
    try { await callback(); }
    catch (error) {
      console.error(`Could not ${label.toLowerCase()}:`, error);
      alert(`Could not ${label.toLowerCase()}. Please try again.`);
    } finally {
      actionRef.current = false;
      setAction("");
    }
  };

  const handlePhotoSelect = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    setUploadingPhoto(true);
    try {
    const uploaded = await uploadToCloudinary(file, `inventory/${folderSegment(event)}/${folderSegment(brandEmail)}`);
    return uploaded.url;
    } finally { setUploadingPhoto(false); }
  };

  const addProduct = async () => {
    const price = Number(newProduct.base_price);
    if (!newProduct.name.trim() || !newProduct.base_price.trim() || !Number.isFinite(price) || price < 0) { alert("Enter a product name and valid non-negative price."); return; }
    await runAction("Save product", async () => {
    let photoUrl = newProduct.photo_url;
    if (selectedFile) {
      photoUrl = await uploadPhoto(selectedFile);
    }
    try {
    const { data, error } = await supabase.from("brand_products").insert({
      event, brand_email: brandEmail, brand_name: brandName,
      name: newProduct.name, category: newProduct.category,
      base_price: price,
      photo_url: photoUrl || null,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved product was not returned.");
    setProducts(prev => [...prev, { ...data, variations: [] }]);
    setNewProduct({ name: "", category: "Clothing", base_price: "", photo_url: "" });
    setPhotoPreview(null);
    setSelectedFile(null);
    setAddingProduct(false);
    } catch (error) {
      if (!selectedFile) throw error;
      console.error("Could not save product after uploading photo:", error);
      alert("The photo was uploaded, but the product could not be saved. The uploaded file may need separate cleanup.");
    }
    });
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Remove this product and all its variations?")) return;
    await runAction("Remove product", async () => {
    const { error } = await supabase.from("brand_products").delete().eq("id", id).select("id").single();
    if (error) throw error;
    setProducts(prev => prev.filter(p => p.id !== id));
    });
  };

  const addVariation = async (productId: number) => {
    const quantity = Number(newVariation.quantity);
    const price = newVariation.price.trim() ? Number(newVariation.price) : null;
    if (!newVariation.quantity.trim() || !Number.isInteger(quantity) || quantity < 0 || (price !== null && (!Number.isFinite(price) || price < 0))) { alert("Enter a valid non-negative quantity and price."); return; }
    const product = products.find(p => p.id === productId);
    if (!product) { alert("Product not found."); return; }
    await runAction("Add variation", async () => {
    const { data, error } = await supabase.from("brand_product_variations").insert({
      product_id: productId,
      size: newVariation.size,
      colour: newVariation.colour,
      quantity,
      price: price ?? product.base_price,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved variation was not returned.");
    {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, variations: [...(p.variations || []), data] } : p));
    }
    setNewVariation({ size: "One Size", colour: "Black", quantity: "", price: "" });
    setAddingVariation(null);
    });
  };

  const deleteVariation = async (productId: number, variationId: number) => {
    await runAction("Remove variation", async () => {
    const { error } = await supabase.from("brand_product_variations").delete().eq("id", variationId).select("id").single();
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, variations: p.variations?.filter(v => v.id !== variationId) } : p));
    });
  };

  const uploadProductToSquare = async (product: Product) => {
    setUploadingToSquare(product.id);
    const res = await fetch("/api/square/upload-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          name: product.name,
          category: product.category,
          base_price: product.base_price,
          photo_url: product.photo_url,
          variations: product.variations,
        }],
        brandName,
        brandEmail,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await supabase.from("brand_products").update({ square_catalog_id: "uploaded" }).eq("id", product.id);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, square_catalog_id: "uploaded" } : p));
      alert(`${product.name} uploaded to Square!`);
      await notifyOrganizer({
        event,
        brandEmail,
        brandName,
        type: "square_upload",
        message: `uploaded ${product.name} to Square POS`,
      });
    } else {
      alert("Error: " + (data.error || "Upload failed"));
    }
    setUploadingToSquare(null);
  };

  const saveVariationEdit = async (productId: number, variationId: number) => {
    const quantity = Number(editVariationData.quantity);
    const price = Number(editVariationData.price);
    if (!editVariationData.size.trim() || !editVariationData.colour.trim() || !editVariationData.quantity.trim() || !editVariationData.price.trim() || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) { alert("Enter a size, colour, and valid non-negative quantity and price."); return; }
    await runAction("Save variation", async () => {
    const { error } = await supabase.from("brand_product_variations").update({
      size: editVariationData.size,
      colour: editVariationData.colour,
      quantity,
      price,
    }).eq("id", variationId).select("id").single();
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === productId ? {
      ...p,
      variations: (p.variations || []).map(v => v.id === variationId ? {
        ...v,
        size: editVariationData.size,
        colour: editVariationData.colour,
        quantity,
        price,
      } : v)
    } : p));
    setEditingVariation(null);
    });
  };

  const saveProductEdit = async (productId: number) => {
    const price = Number(editProductData.base_price);
    if (!editProductData.name.trim() || !editProductData.base_price.trim() || !Number.isFinite(price) || price < 0) { alert("Enter a product name and valid non-negative price."); return; }
    await runAction("Save product changes", async () => {
    const { error } = await supabase.from("brand_products").update({
      name: editProductData.name,
      category: editProductData.category,
      base_price: price,
    }).eq("id", productId).select("id").single();
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, name: editProductData.name, category: editProductData.category, base_price: price } : p));
    setEditingProduct(null);
    });
  };

  const updateProductPhoto = async (productId: number, file: File) => {
    await runAction("Update photo", async () => {
      const uploaded = await uploadToCloudinary(file, `${folderSegment(brandEmail)}/products`);
      try {
        const { error } = await supabase.from("brand_products").update({ photo_url: uploaded.url }).eq("id", productId).select("id").single();
        if (error) throw error;
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, photo_url: uploaded.url } : p));
      } catch (error) {
        console.error("Could not save uploaded photo:", error);
        alert("The photo was uploaded, but the product could not be updated. The uploaded file may need separate cleanup.");
      }
    });
  };

  const submitForReview = async (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Validate photo
    if (!product.photo_url) {
      alert("Please upload a product photo before submitting for review.");
      return;
    }

    // Validate variations
    if (!product.variations || product.variations.length === 0) {
      alert("Please add at least one variation (size and colour) before submitting for review.");
      return;
    }

    // Validate each variation
    for (const v of product.variations) {
      if (!v.size) { alert(`Please add a size to all variations for ${product.name}.`); return; }
      if (!v.colour) { alert(`Please add a colour to all variations for ${product.name}.`); return; }
      if (!v.quantity || v.quantity <= 0) { alert(`Please add a quantity greater than 0 to all variations for ${product.name}.`); return; }
    }

    await runAction("Submit product for review", async () => {
    const { error } = await supabase.from("brand_products").update({ review_status: "pending" }).eq("id", productId).select("id").single();
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, review_status: "pending" } : p));
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    });
  };

  const submitAllForReview = async () => {
    await runAction("Submit products for review", async () => {
    const unsubmitted = products.filter(p => !p.review_status || p.review_status === "rejected");
    const errors: string[] = [];
    const successful: number[] = [];

    for (const product of unsubmitted) {
      if (!product.photo_url) { errors.push(`${product.name}: missing photo`); continue; }
      if (!product.variations || product.variations.length === 0) { errors.push(`${product.name}: no variations added`); continue; }
      const badVariation = product.variations.find(v => !v.size || !v.colour || !v.quantity || v.quantity <= 0);
      if (badVariation) { errors.push(`${product.name}: incomplete variation (check size, colour, quantity)`); continue; }
      try {
        const { error } = await supabase.from("brand_products").update({ review_status: "pending" }).eq("id", product.id).select("id").single();
        if (error) throw error;
        successful.push(product.id);
      } catch (error) {
        console.error(`Could not submit product ${product.id}:`, error);
        errors.push(`${product.name}: could not be submitted`);
      }
    }

    if (errors.length > 0) {
      alert("Some products could not be submitted:\n\n" + errors.join("\n"));
    }

    setProducts(prev => prev.map(p => successful.includes(p.id) ? { ...p, review_status: "pending" } : p));
    if (successful.length) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
    });
  };

  const uploadAllToSquare = async () => {
    setUploadingAllToSquare(true);
    for (const product of products) {
      if (!product.square_catalog_id) {
        await uploadProductToSquare(product);
      }
    }
    setUploadingAllToSquare(false);
    alert("All products uploaded to Square!");
  };

  const totalUnits = products.reduce((s, p) => s + (p.variations || []).reduce((vs, v) => vs + Number(v.quantity), 0), 0);
  const totalValue = products.reduce((s, p) => s + (p.variations || []).reduce((vs, v) => vs + Number(v.price ?? p.base_price) * Number(v.quantity), 0), 0);
  const inSquare = products.filter(p => p.square_catalog_id).length;

  const inp = (style?: object) => ({ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  ...style });

  if (loading || loadError) return <LoadingView loading={loading} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<PageSkeleton label="Loading inventory" />} />;

  return (
    <div className="[overflow-wrap:anywhere]">
      {action && <div role="status" style={{ color: "#4a5a52", marginBottom: "1rem" }}>{action} in progress...</div>}
      <fieldset disabled={!!action} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "4px" }}>Product catalogue</div>
          <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>Add all products you are sending to the pop-up. We will upload them to our Square POS terminal.</div>
          {products.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{products.length} product{products.length !== 1 ? "s" : ""}</span>
              <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{totalUnits.toLocaleString("en-US")} units</span>
              <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Total value: {formatCurrency(totalValue)}</span>
              <span style={{ fontSize: "0.75rem", color: "#4a7c59" }}>{inSquare}/{products.length} in Square</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {products.some(p => !p.review_status || p.review_status === "rejected") && (
            <button onClick={submitAllForReview} style={{ padding: "8px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer" }}>↑ Submit all for review</button>
          )}
          <button onClick={() => setAddingProduct(true)} style={{ padding: "8px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer" }}>+ Add product</button>
        </div>
      </div>

      {/* Add product form */}
      {addingProduct && (
        <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "1rem" }}>New product</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr] [&>input]:min-w-0 [&>select]:min-w-0" style={{ marginBottom: "1rem" }}>
            <input placeholder="Product name e.g. Black Midi Dress" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} style={inp()} />
            <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} style={inp()}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Base price ($)" type="number" value={newProduct.base_price} onChange={e => setNewProduct({...newProduct, base_price: e.target.value})} style={inp()} />
          </div>

          {/* Photo upload */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "6px" }}>PRODUCT PHOTO</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
              <div onClick={() => { if (!action) document.getElementById("product-photo-upload")?.click(); }} style={{ width: "100px", height: "100px", border: "2px dashed #e4ebe6", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: photoPreview ? "#000" : "#f8faf8", overflow: "hidden", flexShrink: 0 }}>
                <input id="product-photo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#4a5a52" }}>📷<br/>Upload</div>
                )}
              </div>
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginBottom: "4px" }}>Or paste a photo URL</div>
                <input placeholder="https://..." value={newProduct.photo_url} onChange={e => { setNewProduct({...newProduct, photo_url: e.target.value}); if (e.target.value) { setSelectedFile(null); setPhotoPreview(null); } }} style={inp({ width: "100%", boxSizing: "border-box" as const })} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button onClick={addProduct} disabled={uploadingPhoto} style={{ padding: "8px 18px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
              {uploadingPhoto ? "Uploading photo..." : "Save product"}
            </button>
            <button onClick={() => { setAddingProduct(false); setPhotoPreview(null); setSelectedFile(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Products list */}
      {products.length === 0 && !addingProduct && (
        <div style={{ background: "#fff", borderRadius: "14px", padding: "4rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No products yet</div>
          <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Add the products you plan to bring to the pop-up.</div>
        </div>
      )}

      {products.map(product => {
        const productUnits = (product.variations || []).reduce((s, v) => s + Number(v.quantity), 0);
        const productValue = (product.variations || []).reduce((s, v) => s + Number(v.price ?? product.base_price) * Number(v.quantity), 0);
        return (
          <div key={product.id} style={{ background: "#fff", borderRadius: "14px", marginBottom: "1rem", border: "1px solid #e4ebe6", overflow: "hidden" }}>
            {/* Product header */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", padding: "1.25rem", alignItems: "flex-start" }}>
              {/* Photo */}
              <div style={{ width: "80px", height: "80px", borderRadius: "10px", background: "#f8faf8", flexShrink: 0, overflow: "hidden", border: "1px solid #e4ebe6" }}>
                {product.photo_url ? (
                  <img src={product.photo_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📷</div>
                )}
              </div>
              {/* Info */}
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "2px" }}>{product.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{product.category} · Base price {formatCurrency(Number(product.base_price))}</div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{productUnits.toLocaleString("en-US")} units</span>
                      <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}>Value: {formatCurrency(productValue)}</span>
                      {product.review_status === "approved" && <span style={{ fontSize: "0.72rem", color: "#4a7c59" }}>✓ Approved</span>}
                      {product.review_status === "pending" && <span style={{ fontSize: "0.72rem", color: "#b87333" }}>⏳ Pending review</span>}
                      {product.review_status === "rejected" && <span style={{ fontSize: "0.72rem", color: "#c0392b" }}>✕ Rejected</span>}
                      {product.square_catalog_id && <span style={{ fontSize: "0.72rem", color: "#4a7c59" }}>✓ In Square</span>}
                    </div>
                    {product.review_status === "rejected" && product.review_note && (
                      <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#c0392b", background: "#fdf0f0", padding: "4px 8px", borderRadius: "6px", borderLeft: "2px solid #c0392b" }}>
                        Note: {product.review_note}
                      </div>
                    )}
                    {editingProduct === product.id && (
                      <div style={{ marginTop: "8px", background: "#f8faf8", borderRadius: "10px", padding: "1rem", border: "1px solid #e4ebe6", display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                        <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.1em" }}>EDIT PRODUCT</div>
                        <input value={editProductData.name} onChange={e => setEditProductData({...editProductData, name: e.target.value})} placeholder="Product name" style={inp()} />
                        <select value={editProductData.category} onChange={e => setEditProductData({...editProductData, category: e.target.value})} style={inp()}>
                          {["Clothing", "Shoes", "Accessories", "Jewellery", "Beauty", "Food & Drink", "Home", "Art", "Other"].map(c => <option key={c}>{c}</option>)}
                        </select>
                        <input value={editProductData.base_price} onChange={e => setEditProductData({...editProductData, base_price: e.target.value})} placeholder="Base price" type="number" style={inp()} />
                        <div>
                          <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "4px" }}>UPDATE PHOTO (optional)</div>
                          <input type="file" accept="image/*" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file || !brandEmail) return;
                            await updateProductPhoto(product.id, file);
                            e.target.value = "";
                          }} style={{ fontSize: "0.82rem", width: "100%" }} />
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => saveProductEdit(product.id)} style={{ flex: 1, padding: "8px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Save changes</button>
                          <button onClick={() => setEditingProduct(null)} style={{ padding: "8px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>You can also edit or add variations below after saving.</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {!product.square_catalog_id && (product.variations || []).length > 0 && (
                      <button onClick={() => submitForReview(product.id)} disabled={product.review_status === "pending" || product.review_status === "approved"} style={{ fontSize: "0.75rem", padding: "5px 10px", background: product.review_status === "approved" ? "#4a7c59" : product.review_status === "pending" ? "#E8C97A" : "#1B3A2D", color: product.review_status === "pending" ? "#1B3A2D" : "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        {product.review_status === "approved" ? "✓ Approved" : product.review_status === "pending" ? "Pending review" : product.review_status === "rejected" ? "Resubmit" : "Submit for review"}
                      </button>
                    )}
                    {product.review_status === "rejected" && (
                      <button onClick={() => { setEditingProduct(product.id); setEditProductData({ name: product.name, category: product.category, base_price: String(product.base_price) }); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4a5a52", fontSize: "14px" }}>✎</button>
                    )}
                    <button onClick={() => deleteProduct(product.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "14px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Variations table */}
            {(product.variations || []).length > 0 && (
              <div role="region" aria-label={`${product.name} variations`} tabIndex={0} style={{ borderTop: "1px solid #f0f4f1", overflowX: "auto" }}>
                <div style={{ minWidth: "520px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 40px", padding: "8px 16px", background: "#f8faf8", fontSize: "0.68rem", color: "#4a5a52", letterSpacing: "0.08em" }}>
                  <div>SIZE</div><div>COLOUR</div><div>QTY</div><div>PRICE</div><div></div>
                </div>
                {(product.variations || []).map(v => (
                  <div key={v.id}>
                    {editingVariation === v.id ? (
                      <div className="[&>input]:min-w-0 [&>select]:min-w-0" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr)) 80px", padding: "6px 16px", borderTop: "1px solid #f5f2ee", gap: "4px", alignItems: "center" }}>
                        <select value={SIZES.slice(0,-1).includes(editVariationData.size) ? editVariationData.size : "Other"} onChange={e => setEditVariationData({...editVariationData, size: e.target.value === "Other" ? "" : e.target.value})} style={{ padding: "4px", border: "1px solid #E8C97A", borderRadius: "4px", fontSize: "0.78rem" }}>{SIZES.map(s => <option key={s}>{s}</option>)}</select>
                        <input value={editVariationData.colour} onChange={e => setEditVariationData({...editVariationData, colour: e.target.value})} style={{ padding: "4px", border: "1px solid #E8C97A", borderRadius: "4px", fontSize: "0.78rem" }} />
                        <input type="number" value={editVariationData.quantity} onChange={e => setEditVariationData({...editVariationData, quantity: e.target.value})} style={{ padding: "4px", border: "1px solid #E8C97A", borderRadius: "4px", fontSize: "0.78rem" }} />
                        <input type="number" value={editVariationData.price} onChange={e => setEditVariationData({...editVariationData, price: e.target.value})} style={{ padding: "4px", border: "1px solid #E8C97A", borderRadius: "4px", fontSize: "0.78rem" }} />
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button onClick={() => saveVariationEdit(product.id, v.id)} style={{ padding: "3px 6px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>✓</button>
                          <button onClick={() => setEditingVariation(null)} style={{ padding: "3px 6px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr)) 40px", padding: "8px 16px", borderTop: "1px solid #f5f2ee", alignItems: "center" }}>
                        <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{v.size || "—"}</div>
                        <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{v.colour || "—"}</div>
                        <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{Number(v.quantity).toLocaleString("en-US")}</div>
                        <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{formatCurrency(Number(v.price ?? product.base_price))}</div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {(product.review_status === "rejected" || !product.review_status) && <button onClick={() => { setEditingVariation(v.id); setEditVariationData({ size: v.size || "", colour: v.colour || "", quantity: String(v.quantity), price: String(v.price ?? product.base_price) }); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4a5a52", fontSize: "11px" }}>✎</button>}
                          {(product.review_status !== "pending" && product.review_status !== "approved") && <button onClick={() => deleteVariation(product.id, v.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            )}

            {/* Add variation form */}
            {addingVariation === product.id ? (
              <div style={{ borderTop: "1px solid #f0f4f1", padding: "1rem 1.25rem", background: "#f8faf8" }}>
                <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-[1fr_1fr_0.6fr_0.6fr] [&>div]:min-w-0" style={{ marginBottom: "10px", alignItems: "end" }}>
                  <div>
                    <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>SIZE</div>
                    <select value={SIZES.slice(0,-1).includes(newVariation.size) ? newVariation.size : "Other"} onChange={e => setNewVariation({...newVariation, size: e.target.value === "Other" ? "" : e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const }}>
                      {SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {!SIZES.slice(0,-1).includes(newVariation.size) && <input placeholder="e.g. 20" value={newVariation.size} onChange={e => setNewVariation({...newVariation, size: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const, marginTop: "4px" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>COLOUR</div>
                    <select value={COLOURS.slice(0,-1).includes(newVariation.colour) ? newVariation.colour : "Other"} onChange={e => setNewVariation({...newVariation, colour: e.target.value === "Other" ? "" : e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const }}>
                      {COLOURS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {!COLOURS.slice(0,-1).includes(newVariation.colour) && <input placeholder="e.g. Burgundy" value={newVariation.colour} onChange={e => setNewVariation({...newVariation, colour: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const, marginTop: "4px" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>QTY</div>
                    <input placeholder="0" type="number" min="1" value={newVariation.quantity} onChange={e => setNewVariation({...newVariation, quantity: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>PRICE</div>
                    <input placeholder={`$${product.base_price}`} type="number" value={newVariation.price} onChange={e => setNewVariation({...newVariation, price: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const }} />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <button onClick={() => addVariation(product.id)} style={{ padding: "8px 18px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Add variation</button>
                  <button onClick={() => setAddingVariation(null)} style={{ padding: "8px 14px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ borderTop: "1px solid #f0f4f1", padding: "10px 16px" }}>
                {(product.review_status !== "pending" && product.review_status !== "approved") && <button onClick={() => setAddingVariation(product.id)} style={{ fontSize: "0.78rem", color: "#E8C97A", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>+ Add variation (size / colour)</button>}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary footer */}
      {products.length > 0 && (
        <div style={{ background: "#1B3A2D", borderRadius: "12px", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", marginTop: "1rem" }}>
          <div style={{ display: "flex", gap: "2rem" }}>
            <div><div style={{ fontSize: "0.6rem", color: "#d4c87a", letterSpacing: "0.1em" }}>PRODUCTS</div><div style={{ fontSize: "1.1rem" }}>{products.length}</div></div>
            <div><div style={{ fontSize: "0.6rem", color: "#d4c87a", letterSpacing: "0.1em" }}>TOTAL UNITS</div><div style={{ fontSize: "1.1rem" }}>{totalUnits.toLocaleString("en-US")}</div></div>
            <div><div style={{ fontSize: "0.6rem", color: "#d4c87a", letterSpacing: "0.1em" }}>TOTAL VALUE</div><div style={{ fontSize: "1.1rem" }}>{formatCurrency(totalValue)}</div></div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#d4c87a" }}>{inSquare}/{products.length} uploaded to Square</div>
        </div>
      )}
      {submitted && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "#1B3A2D", color: "#fff", padding: "12px 24px", borderRadius: "10px", fontSize: "0.88rem",  zIndex: 9999, boxShadow: "0 4px 20px #00000033", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#4a7c59" }}>✓</span> Submitted for review. Your organizer will approve shortly.
        </div>
      )}
      </fieldset>
    </div>
  );
}
