import z from "zod";

export const criteresSchema = z.object({
  plage: z.boolean().optional(),
  montagne: z.boolean().optional(),
  ville: z.boolean().optional(),
  sport: z.boolean().optional(),
  detente: z.boolean().optional(),
  campagne: z.boolean().optional(),
  acces_handicap: z.boolean().optional().default(false),
});