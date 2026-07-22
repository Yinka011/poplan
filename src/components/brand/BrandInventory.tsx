/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  variations?: Variation[];
};

const CATEGORIES = ["Clothing", "Accessories", "Shoes", "Bags", "Jewellery", "Beauty", "Home", "Other"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "6", "8", "10", "12", "14", "16", "18", "One Size", "N/A"];
const COLOURS = ["Black", "White", "Beige", "Brown", "Camel", "Grey", "Navy", "Blue", "Green", "Red", "Pink", "Purple", "Orange", "Yellow", "Gold", "Silver", "Multi", "Other"];

type Props = {
  event: string;
  brandEmail: string;
  brandName: string;
};

export default function BrandInventory({ event, brandEmail, brandName }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingToSquare, setUploadingToSquare] = useState<number | null>(null);
  const [uploadingAllToSquare, setUploadingAllToSquare] = useState(false);
  const [addingVariation, setAddingVariation] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", category: "Clothing", base_price: "", photo_url: "" });
  const [newVariation, setNewVariation] = useState({ size: "One Size", colour: "Black", quantity: "", price: "" });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { fetchProducts(); }, [event, brandEmail]);

  const fetchProducts = async () => {
    const { data: productsData } = await supabase
      .from("brand_products")
      .select("*")
      .eq("event", event)
      .eq("brand_email", brandEmail)
      .order("created_at");

    if (!productsData) { setLoading(false); return; }

    const { data: variationsData } = await supabase
      .from("brand_product_variations")
      .select("*")
      .in("product_id", productsData.map((p: any) => p.id));

    const productsWithVariations = productsData.map((p: any) => ({
      ...p,
      variations: variationsData?.filter((v: any) => v.product_id === p.id) || [],
    }));

    setProducts(productsWithVariations);
    setLoading(false);
  };

  const handlePhotoSelect = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `inventory/${event}/${brandEmail.replace(/[@.]/g, "_")}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("brand-uploads").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploadingPhoto(false); return null; }
    const { data: urlData } = supabase.storage.from("brand-uploads").getPublicUrl(path);
    setUploadingPhoto(false);
    return urlData.publicUrl;
  };

  const addProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.base_price) return;
    let photoUrl = newProduct.photo_url;
    if (selectedFile) {
      const uploaded = await uploadPhoto(selectedFile);
      if (uploaded) photoUrl = uploaded;
    }
    const { data } = await supabase.from("brand_products").insert({
      event, brand_email: brandEmail, brand_name: brandName,
      name: newProduct.name, category: newProduct.category,
      base_price: parseFloat(newProduct.base_price),
      photo_url: photoUrl || null,
    }).select().single();
    if (data) setProducts(prev => [...prev, { ...data, variations: [] }]);
    setNewProduct({ name: "", category: "Clothing", base_price: "", photo_url: "" });
    setPhotoPreview(null);
    setSelectedFile(null);
    setAddingProduct(false);
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Remove this product and all its variations?")) return;
    await supabase.from("brand_products").delete().eq("id", id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addVariation = async (productId: number) => {
    if (!newVariation.quantity) return;
    const product = products.find(p => p.id === productId);
    const { data } = await supabase.from("brand_product_variations").insert({
      product_id: productId,
      size: newVariation.size,
      colour: newVariation.colour,
      quantity: parseInt(newVariation.quantity),
      price: newVariation.price ? parseFloat(newVariation.price) : product?.base_price || 0,
    }).select().single();
    if (data) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, variations: [...(p.variations || []), data] } : p));
    }
    setNewVariation({ size: "One Size", colour: "Black", quantity: "", price: "" });
    setAddingVariation(null);
  };

  const deleteVariation = async (productId: number, variationId: number) => {
    await supabase.from("brand_product_variations").delete().eq("id", variationId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, variations: p.variations?.filter(v => v.id !== variationId) } : p));
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
    } else {
      alert("Error: " + (data.error || "Upload failed"));
    }
    setUploadingToSquare(null);
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

  const totalUnits = products.reduce((s, p) => s + (p.variations || []).reduce((vs, v) => vs + v.quantity, 0), 0);
  const totalValue = products.reduce((s, p) => s + (p.variations || []).reduce((vs, v) => vs + (v.price || p.base_price) * v.quantity, 0), 0);
  const inSquare = products.filter(p => p.square_catalog_id).length;

  const inp = (style?: object) => ({ padding: "7px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif", ...style });

  if (loading) return <div style={{ fontSize: "0.85rem", color: "#8b7355", padding: "1rem" }}>Loading inventory...</div>;

  return (
    <div style={{ fontFamily: "Georgia, serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "4px" }}>Product catalogue</div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>Add all products you are sending to the pop-up. We will upload them to our Square POS terminal.</div>
          {products.length > 0 && (
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>{products.length} product{products.length !== 1 ? "s" : ""}</span>
              <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>{totalUnits} units</span>
              <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Total value: ${totalValue.toFixed(2)}</span>
              <span style={{ fontSize: "0.75rem", color: "#4a7c59" }}>{inSquare}/{products.length} in Square</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {products.length > 0 && products.some(p => !p.square_catalog_id) && (
            <button onClick={uploadAllToSquare} disabled={uploadingAllToSquare} style={{ padding: "8px 14px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {uploadingAllToSquare ? "Uploading..." : "↑ Upload all to Square"}
            </button>
          )}
          <button onClick={() => setAddingProduct(true)} style={{ padding: "8px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add product</button>
        </div>
      </div>

      {/* Add product form */}
      {addingProduct && (
        <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>New product</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", marginBottom: "1rem" }}>
            <input placeholder="Product name e.g. Black Midi Dress" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} style={inp()} />
            <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} style={inp()}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Base price ($)" type="number" value={newProduct.base_price} onChange={e => setNewProduct({...newProduct, base_price: e.target.value})} style={inp()} />
          </div>

          {/* Photo upload */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "6px" }}>PRODUCT PHOTO</div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div onClick={() => document.getElementById("product-photo-upload")?.click()} style={{ width: "100px", height: "100px", border: "2px dashed #e8e0d5", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: photoPreview ? "#000" : "#faf8f5", overflow: "hidden", flexShrink: 0 }}>
                <input id="product-photo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#8b7355" }}>📷<br/>Upload</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", color: "#8b7355", marginBottom: "4px" }}>Or paste a photo URL</div>
                <input placeholder="https://..." value={newProduct.photo_url} onChange={e => { setNewProduct({...newProduct, photo_url: e.target.value}); if (e.target.value) { setSelectedFile(null); setPhotoPreview(null); } }} style={inp({ width: "100%", boxSizing: "border-box" as const })} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addProduct} disabled={uploadingPhoto} style={{ padding: "8px 18px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
              {uploadingPhoto ? "Uploading photo..." : "Save product"}
            </button>
            <button onClick={() => { setAddingProduct(false); setPhotoPreview(null); setSelectedFile(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Products list */}
      {products.length === 0 && !addingProduct && (
        <div style={{ background: "#fff", borderRadius: "14px", padding: "4rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>No products yet</div>
          <div style={{ fontSize: "0.82rem", color: "#8b7355" }}>Add the products you plan to bring to the pop-up.</div>
        </div>
      )}

      {products.map(product => {
        const productUnits = (product.variations || []).reduce((s, v) => s + v.quantity, 0);
        const productValue = (product.variations || []).reduce((s, v) => s + (v.price || product.base_price) * v.quantity, 0);
        return (
          <div key={product.id} style={{ background: "#fff", borderRadius: "14px", marginBottom: "1rem", border: "1px solid #e8e0d5", overflow: "hidden" }}>
            {/* Product header */}
            <div style={{ display: "flex", gap: "1rem", padding: "1.25rem", alignItems: "flex-start" }}>
              {/* Photo */}
              <div style={{ width: "80px", height: "80px", borderRadius: "10px", background: "#f5f0ea", flexShrink: 0, overflow: "hidden", border: "1px solid #e8e0d5" }}>
                {product.photo_url ? (
                  <img src={product.photo_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📷</div>
                )}
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "2px" }}>{product.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>{product.category} · Base price ${Number(product.base_price).toFixed(2)}</div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#8b7355" }}>{productUnits} units</span>
                      <span style={{ fontSize: "0.72rem", color: "#8b7355" }}>Value: ${productValue.toFixed(2)}</span>
                      {product.square_catalog_id ? (
                        <span style={{ fontSize: "0.72rem", color: "#4a7c59" }}>✓ In Square</span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "#b87333" }}>Not in Square</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {!product.square_catalog_id && (product.variations || []).length > 0 && (
                      <button onClick={() => uploadProductToSquare(product)} disabled={uploadingToSquare === product.id} style={{ fontSize: "0.75rem", padding: "5px 10px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        {uploadingToSquare === product.id ? "..." : "↑ Square"}
                      </button>
                    )}
                    <button onClick={() => deleteProduct(product.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "14px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Variations table */}
            {(product.variations || []).length > 0 && (
              <div style={{ borderTop: "1px solid #f0ebe4" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 40px", padding: "8px 16px", background: "#faf8f5", fontSize: "0.68rem", color: "#8b7355", letterSpacing: "0.08em" }}>
                  <div>SIZE</div><div>COLOUR</div><div>QTY</div><div>PRICE</div><div></div>
                </div>
                {(product.variations || []).map(v => (
                  <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 40px", padding: "8px 16px", borderTop: "1px solid #f5f2ee", alignItems: "center" }}>
                    <div style={{ fontSize: "0.82rem", color: "#2c1810" }}>{v.size || "—"}</div>
                    <div style={{ fontSize: "0.82rem", color: "#2c1810" }}>{v.colour || "—"}</div>
                    <div style={{ fontSize: "0.82rem", color: "#2c1810" }}>{v.quantity}</div>
                    <div style={{ fontSize: "0.82rem", color: "#2c1810" }}>${Number(v.price || product.base_price).toFixed(2)}</div>
                    <button onClick={() => deleteVariation(product.id, v.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add variation form */}
            {addingVariation === product.id ? (
              <div style={{ borderTop: "1px solid #f0ebe4", padding: "1rem 1.25rem", background: "#faf8f5" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "center" }}>
                  <select value={newVariation.size} onChange={e => setNewVariation({...newVariation, size: e.target.value})} style={inp()}>
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select value={newVariation.colour} onChange={e => setNewVariation({...newVariation, colour: e.target.value})} style={inp()}>
                    {COLOURS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input placeholder="Qty" type="number" value={newVariation.quantity} onChange={e => setNewVariation({...newVariation, quantity: e.target.value})} style={inp()} />
                  <input placeholder={`Price (default $${product.base_price})`} type="number" value={newVariation.price} onChange={e => setNewVariation({...newVariation, price: e.target.value})} style={inp()} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => addVariation(product.id)} style={{ padding: "7px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}>Add</button>
                    <button onClick={() => setAddingVariation(null)} style={{ padding: "7px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ borderTop: "1px solid #f0ebe4", padding: "10px 16px" }}>
                <button onClick={() => setAddingVariation(product.id)} style={{ fontSize: "0.78rem", color: "#b87333", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>+ Add variation (size / colour)</button>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary footer */}
      {products.length > 0 && (
        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", marginTop: "1rem" }}>
          <div style={{ display: "flex", gap: "2rem" }}>
            <div><div style={{ fontSize: "0.6rem", color: "#c8b89a", letterSpacing: "0.1em" }}>PRODUCTS</div><div style={{ fontSize: "1.1rem" }}>{products.length}</div></div>
            <div><div style={{ fontSize: "0.6rem", color: "#c8b89a", letterSpacing: "0.1em" }}>TOTAL UNITS</div><div style={{ fontSize: "1.1rem" }}>{totalUnits}</div></div>
            <div><div style={{ fontSize: "0.6rem", color: "#c8b89a", letterSpacing: "0.1em" }}>TOTAL VALUE</div><div style={{ fontSize: "1.1rem" }}>${totalValue.toFixed(2)}</div></div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#c8b89a" }}>{inSquare}/{products.length} uploaded to Square</div>
        </div>
      )}
    </div>
  );
}
