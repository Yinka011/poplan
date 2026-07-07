const inviteBrand = async (brand: Brand) => {
  if (!brand.email) { alert("Please add an email for this brand first"); return; }
  setInviting(brand.id);
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: brand.email }),
  });
  const data = await res.json();
  if (data.error) {
    alert("Could not send invite: " + data.error);
  } else {
    await supabase.from("brands").update({ invited: true }).eq("id", brand.id);
    setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, invited: true } : b));
    alert(`Invitation sent to ${brand.email}`);
  }
  setInviting(null);
};