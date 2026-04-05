"use client";

import { useState, useCallback } from "react";
import { Student } from "@/lib/supabase";
import {
  updateStudent,
  UpdateStudentData,
  uploadStudentPhotos,
} from "@/lib/api";
import { X, Upload } from "lucide-react";

interface EditStudentDialogProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStudentDialog({
  student,
  isOpen,
  onClose,
  onSuccess,
}: EditStudentDialogProps) {
  const [formData, setFormData] = useState<UpdateStudentData>({
    roll_number: student.roll_number || "",
    name: student.name || "",
    class_name: student.class || "",
    section: student.section || "",
    email: student.email || "",
    phone: student.phone || "",
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      setError("Please select valid image files");
      return;
    }

    if (imageFiles.length > 10) {
      setError("Maximum 10 photos allowed");
      return;
    }

    setPhotos(imageFiles);
    setError(null);

    // Create previews
    const previews = imageFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(setPhotoPreviews);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handlePhotoSelect(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.roll_number?.trim()) {
        throw new Error("Roll number is required");
      }
      if (!formData.name?.trim()) {
        throw new Error("Name is required");
      }

      // First, update student info
      await updateStudent(student.id, formData);

      // Upload new photos if selected
      if (photos.length > 0) {
        await uploadStudentPhotos(student.id, photos);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Edit Student
        </h3>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Photo */}
          {student.photo_url && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-2">
                Current Photo
              </p>
              <div className="w-full h-32 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center overflow-hidden mb-4">
                <img
                  src={student.photo_url}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Change Photo
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-lg border-2 border-dashed transition-colors p-4 text-center cursor-pointer ${
                dragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handlePhotoSelect(e.target.files)}
                disabled={isSubmitting}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Drag and drop image files here, or click to select
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                (Up to 10 photos, PNG, JPG, GIF)
              </p>
            </div>
          </div>

          {/* Photo Previews */}
          {photoPreviews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-2">
                New Photos ({photoPreviews.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      disabled={isSubmitting}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roll Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Roll Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="roll_number"
              value={formData.roll_number || ""}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g., A001"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="John Doe"
            />
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Class
            </label>
            <input
              type="text"
              name="class_name"
              value={formData.class_name || ""}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g., 10-A"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Section
            </label>
            <input
              type="text"
              name="section"
              value={formData.section || ""}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g., A"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="john@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone || ""}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="+91 9876543210"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating...
                </>
              ) : (
                "Update Student"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
