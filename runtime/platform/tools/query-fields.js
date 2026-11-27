import { z } from "zod";
const id = z.string().trim().min(1).max(512);
const revision = z.number().int().positive();
const novel = { novelId: id };
const page = { offset: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(200).optional() };
const query = z.string().max(2e3).optional();
const optionalId = id.nullable().optional();
export {
  id,
  novel,
  optionalId,
  page,
  query,
  revision
};
