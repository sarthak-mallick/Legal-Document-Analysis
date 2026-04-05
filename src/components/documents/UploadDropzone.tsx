"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UploadDropzoneProps {
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
}

// This component handles local PDF selection for the Week 1 upload flow.
export function UploadDropzone({ isUploading, onUpload }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // This handler forwards a selected file into the upload workflow.
  async function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    await onUpload(file);
  }

  return (
    <Card
      className={`border-dashed ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setDragging(false);
        await handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-col items-start gap-4">
        <div className="space-y-2">
          <p className="font-serif text-2xl text-foreground">Upload a legal document</p>
          <p className="max-w-2xl text-sm text-slate-600">
            PDF files up to 10MB. Documents are parsed with table detection, classified by type,
            chunked, embedded, and stored for analysis.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={isUploading} onClick={() => inputRef.current?.click()}>
            {isUploading ? "Uploading..." : "Choose PDF"}
          </Button>
          <Button
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            variant="secondary"
          >
            Drag and drop is also supported
          </Button>
        </div>
      </div>
      <input
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          await handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </Card>
  );
}
