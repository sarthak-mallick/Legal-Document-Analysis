"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UploadDropzoneProps {
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
}

// This component handles local PDF selection for the upload flow.
export function UploadDropzone({ isUploading, onUpload }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    await onUpload(file);
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Upload className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {isUploading ? "Uploading..." : "Upload a legal document"}
        </p>
        <p className="text-xs text-muted-foreground">
          Drag and drop a PDF, or click to browse. Files up to 10MB.
        </p>
      </div>
      <Button
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        variant="outline"
        size="sm"
      >
        Choose PDF
      </Button>
      <input
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          const input = event.currentTarget;
          await handleFiles(event.target.files);
          input.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
