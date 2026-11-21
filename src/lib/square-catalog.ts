type CatalogObject = {
  id: string;
  type: string;
  item_variation_data?: { item_id?: string };
  item_data?: {
    categories?: { id: string }[];
    category_id?: string;
    reporting_category?: { id: string };
  };
  category_data?: { name?: string };
};

type CatalogResponse = {
  objects?: CatalogObject[];
  related_objects?: CatalogObject[];
  errors?: { detail?: string }[];
};

export async function fetchSquareCatalog(
  ids: string[],
  accessToken: string,
): Promise<Map<string, CatalogObject>> {
  const objects = new Map<string, CatalogObject>();
  const requested = new Set<string>();

  async function fetchObjects(objectIds: string[]) {
    const pending = [...new Set(objectIds)].filter((id) => !requested.has(id));
    for (let offset = 0; offset < pending.length; offset += 100) {
      const batch = pending.slice(offset, offset + 100);
      batch.forEach((id) => requested.add(id));
      const response = await fetch("https://connect.squareup.com/v2/catalog/batch-retrieve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify({ object_ids: batch, include_related_objects: true }),
      });
      const data: CatalogResponse = await response.json();
      if (!response.ok || data.errors?.length) {
        throw new Error(data.errors?.[0]?.detail || "Square catalog lookup failed.");
      }
      for (const object of [...(data.objects ?? []), ...(data.related_objects ?? [])]) {
        objects.set(object.id, object);
      }
    }
  }

  await fetchObjects(ids);
  const itemIds = ids.flatMap((id) => {
    const itemId = objects.get(id)?.item_variation_data?.item_id;
    return itemId && !objects.has(itemId) ? [itemId] : [];
  });
  await fetchObjects(itemIds);
  const categoryIds = [...objects.values()].flatMap((object) => {
    if (object.type !== "ITEM" || !object.item_data) return [];
    return [
      ...(object.item_data.categories ?? []).map((category) => category.id),
      ...(object.item_data.category_id ? [object.item_data.category_id] : []),
      ...(object.item_data.reporting_category?.id ? [object.item_data.reporting_category.id] : []),
    ];
  });
  await fetchObjects(categoryIds.filter((id) => !objects.has(id)));
  return objects;
}

export function squareCategoryNames(
  catalog: Map<string, CatalogObject>,
  catalogId: string,
): string[] | null {
  const object = catalog.get(catalogId);
  const item = object?.type === "ITEM_VARIATION"
    ? catalog.get(object.item_variation_data?.item_id ?? "")
    : object;
  if (!item || item.type !== "ITEM" || !item.item_data) return null;

  const categoryIds = [
    ...(item.item_data.categories ?? []).map((category) => category.id),
    ...(item.item_data.category_id ? [item.item_data.category_id] : []),
    ...(item.item_data.reporting_category?.id ? [item.item_data.reporting_category.id] : []),
  ];
  const names: string[] = [];
  for (const id of new Set(categoryIds)) {
    const category = catalog.get(id);
    if (category?.type !== "CATEGORY" || !category.category_data?.name) return null;
    names.push(category.category_data.name);
  }
  return names;
}
