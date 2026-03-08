import { NextResponse } from "next/server";

import { getNumberEnv } from "@/lib/env";
import { ingestDocument } from "@/lib/ingestion/pipeline";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// This route validates a PDF upload, creates a document record, and runs ingestion.
export async function POST(request: Request) {
  console.info("[api/upload] Upload received");

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[api/upload] Authentication failed", authError);
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    const maxUploadSizeMb = getNumberEnv("MAX_UPLOAD_SIZE_MB", 10);
    const maxUploadBytes = maxUploadSizeMb * 1024 * 1024;

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are supported." }, { status: 400 });
    }

    if (file.size > maxUploadBytes) {
      return NextResponse.json(
        { error: `PDF exceeds the ${maxUploadSizeMb}MB upload limit.` },
        { status: 400 },
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { data: insertedDocument, error: insertError } = await adminClient
      .from("documents")
      .insert({
        filename: file.name,
        file_size: file.size,
        upload_status: "processing",
        user_id: user.id,
      })
      .select("id")
      .single();

    if (insertError || !insertedDocument) {
      console.error("[api/upload] Failed to create document row", insertError);
      return NextResponse.json({ error: "Failed to create document record." }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await ingestDocument({
      buffer,
      documentId: insertedDocument.id,
    });

    return NextResponse.json({
      documentId: insertedDocument.id,
      status: "ready",
    });
  } catch (error) {
    console.error("[api/upload] Upload processing failed", error);
    return NextResponse.json({ error: "Upload processing failed." }, { status: 500 });
  }
}
