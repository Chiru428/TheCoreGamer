import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Validate an already-parsed body against a Zod schema.
 * Returns parsed data on success, or a 400 response with field-level errors.
 */
export function validateData<T extends z.ZodType>(
  body: unknown,
  schema: T
): { data: z.infer<T>; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "_root";
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    logger.error({ fieldErrors }, "Validation Error");

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: "One or more fields are invalid",
          fieldErrors,
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or a 400 response with field-level errors.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    return validateData(body, schema);
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: "Invalid JSON", message: "Request body must be valid JSON" },
        { status: 400 }
      ),
    };
  }
}
