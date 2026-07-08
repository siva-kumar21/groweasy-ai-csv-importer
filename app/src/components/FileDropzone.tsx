"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

type FileDropzoneProps = {
  file: File | null;
  onFile: (file: File) => void;
};

export function FileDropzone({ file, onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <section
      className={`dropzone ${dragging ? "isDragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) onFile(dropped);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onFile(selected);
        }}
      />
      <div className="dropIcon">
        <UploadCloud aria-hidden size={28} />
      </div>
      <div>
        <h2>{file ? file.name : "Upload a CSV file"}</h2>
        <p>{file ? `${(file.size / 1024).toFixed(1)} KB ready for preview` : "Drag and drop a CSV here, or choose a file"}</p>
      </div>
    </section>
  );
}
