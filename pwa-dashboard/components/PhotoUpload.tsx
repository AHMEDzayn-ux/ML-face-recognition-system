"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PhotoUploadProps {
  studentId: string;
  studentName: string;
  currentPhotoUrl: string | null;
  onPhotoUpdated: (photoUrl: string) => void;
}

export default function PhotoUpload({
  studentId,
  studentName,
  currentPhotoUrl,
  onPhotoUpdated,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("student-photos").remove([oldPath]);
        }
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from("student-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from("student-photos")
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      // Update student record
      const { error: updateError } = await supabase
        .from("students")
        .update({ photo_url: data.publicUrl })
        .eq("id", studentId);

      if (updateError) throw updateError;

      // Update UI
      setPreview(data.publicUrl);
      onPhotoUpdated(data.publicUrl);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload photo");
      setPreview(currentPhotoUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setIsUploading(true);
    setError(null);

    try {
      // Delete from storage
      const fileName = currentPhotoUrl.split("/").pop();
      if (fileName) {
        await supabase.storage.from("student-photos").remove([fileName]);
      }

      // Update student record
      const { error: updateError } = await supabase
        .from("students")
        .update({ photo_url: null })
        .eq("id", studentId);

      if (updateError) throw updateError;

      setPreview(null);
      onPhotoUpdated("");
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to remove photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Photo Preview */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center group">
        {preview ? (
          <>
            <img
              src={preview}
              alt={studentName}
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleRemovePhoto}
              disabled={isUploading}
              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No photo</p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload Photo
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Info Text */}
      <p className="text-xs text-slate-500 text-center">
        JPG, PNG or WebP (Max 5MB)
      </p>
    </div>
  );
}
