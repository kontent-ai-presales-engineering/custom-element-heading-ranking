import { z } from "zod";

export type Config = Readonly<{
  elementsCodenames: ReadonlyArray<string>;
  previewApiKey: string;
  startingLevel?: number;
  skipMultipleH1sWarning?: boolean;
}>;

export const configSchema: z.Schema<Config | null> = z.object({
  elementsCodenames: z.array(z.string()),
  previewApiKey: z.string(),
  startingLevel: z.number().optional(),
  skipMultipleH1sWarning: z.boolean().optional(),
}).nullable();
