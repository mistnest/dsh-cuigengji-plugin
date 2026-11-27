import {z} from 'zod';

export const id = z.string().trim().min(1).max(512);
export const revision = z.number().int().positive();
export const novel = {novelId:id};
export const page = {offset:z.number().int().min(0).optional(),limit:z.number().int().min(1).max(200).optional()};
export const query = z.string().max(2000).optional();
export const optionalId = id.nullable().optional();
