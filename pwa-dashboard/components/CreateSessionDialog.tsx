"use client";

import { useState } from "react";
import { createSession, CreateSessionData } from "@/lib/api";
import { X, Loader2, Calendar, Clock } from "lucide-react";

interface CreateSessionDialogProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: any) => void;
}

export default function CreateSessionDialog({
  tripId,
  isOpen,
  onClose,
  onSessionCreated,
}: CreateSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSessionData>({
    name: "",
    description: "",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Session name is required");
      return;
    }

    if (!formData.session_date) {
      setError("Session date is required");
      return;
    }

    try {
      setLoading(true);
      const result = await createSession(tripId, formData);

      if (result.success) {
        onSessionCreated?.(result.session);
        // Reset form
        setFormData({
          name: "",
          description: "",
          session_date: new Date().toISOString().split("T")[0],
          start_time: "",
          end_time: "",
        });
        onClose();
      } else {
        setError(result.message || "Failed to create session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 sm:p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Create New Session
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Morning Session, Afternoon Session"
              disabled={loading}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              placeholder="Add notes about this session"
              disabled={loading}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* Session Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                name="session_date"
                value={formData.session_date}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full rounded border border-gray-300 px-3 py-2 pl-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time || ""}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full rounded border border-gray-300 px-3 py-2 pl-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time || ""}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full rounded border border-gray-300 px-3 py-2 pl-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Session"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
