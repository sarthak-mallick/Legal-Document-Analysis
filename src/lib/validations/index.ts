import { z } from "zod/v4";

export const uuidSchema = z.string().uuid();

// Parse a request body against a Zod schema. Returns the parsed data or a 400 Response.
export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: "Invalid request body.",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return { success: true, data: result.data };
}
