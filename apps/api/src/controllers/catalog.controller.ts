import { Request, Response } from "express";
import { getCatalogItem, listCatalogItems } from "../services/catalog.service.js";

export async function listCatalog(req: Request, res: Response) {
  const sortByInput = req.query.sortBy;
  const sortOrderInput = req.query.sortOrder;

  const query = {
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    brand: typeof req.query.brand === "string" ? req.query.brand : undefined,
    model: typeof req.query.model === "string" ? req.query.model : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    sortBy:
      sortByInput === "name" || sortByInput === "price"
        ? (sortByInput as "name" | "price")
        : undefined,
    sortOrder:
      sortOrderInput === "asc" || sortOrderInput === "desc"
        ? (sortOrderInput as "asc" | "desc")
        : undefined
  };

  const items = await listCatalogItems(query);
  res.json({ items });
}

export async function getItem(req: Request, res: Response) {
  const item = await getCatalogItem(String(req.params.itemId));
  res.json({ item });
}
