"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTrip, uploadTripCSV } from "@/lib/api";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function NewTripPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trip_date: "",
    departure_time: "",
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"create" | "upload">("create");
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createTrip(formData);

      if (result.success && result.trip) {
        setCreatedTripId(result.trip.id);

        if (csvFile) {
          setStep("upload");
        } else {
          // No CSV, go directly to trip dashboard
          router.push(`/trips/${result.trip.id}`);
        }
      } else {
        setError("Failed to create trip");
      }
    } catch (err: any) {
      setError(err.message || "Error creating trip");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile || !createdTripId) return;

    setError(null);
    setLoading(true);

    try {
      const result = await uploadTripCSV(createdTripId, csvFile);
      setUploadResult(result);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        router.push(`/trips/${createdTripId}`);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error uploading CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trips
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create New Trip
          </h1>
          <p className="text-slate-600">
            Set up a new trip session and import participants
          </p>
        </div>

        {/* Step 1: Create Trip */}
        {step === "create" && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Trip Details
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Trip Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Trip Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Hikkaduwa Beach Trip 2026"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the trip..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Trip Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.trip_date}
                    onChange={(e) =>
                      setFormData({ ...formData, trip_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Departure Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departure_time: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* CSV Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Participant List (Optional)
                </label>
                <p className="text-sm text-slate-600 mb-3">
                  Upload a CSV file with participant roll numbers. You can also
                  add participants later.
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  {csvFile ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {csvFile.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(csvFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Click to upload CSV
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        CSV format: roll_number, name, phone (optional)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              {/* CSV Format Example */}
              {csvFile && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Expected CSV Format:
                  </p>
                  <pre className="text-xs text-slate-600 font-mono">
                    {`roll_number
CS/2021/001
CS/2021/015
CS/2021/042`}
                  </pre>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Link
                  href="/trips"
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Trip</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Upload CSV Results */}
        {step === "upload" && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Importing Participants
            </h2>

            {!uploadResult && !loading && (
              <div>
                <p className="text-slate-600 mb-6">
                  Ready to import participants from{" "}
                  <strong>{csvFile?.name}</strong>
                </p>
                <button
                  onClick={handleUploadCSV}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  Upload CSV
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600">Processing CSV file...</p>
              </div>
            )}

            {uploadResult && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Successfully imported {uploadResult.imported}{" "}
                      participants!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-900">
                      {uploadResult.total_processed}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      Total Processed
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-900">
                      {uploadResult.imported}
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      Imported
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {uploadResult.duplicates}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      Duplicates
                    </p>
                  </div>
                </div>

                {uploadResult.not_found &&
                  uploadResult.not_found.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">
                        {uploadResult.not_found.length} student(s) not found in
                        database:
                      </p>
                      <div className="text-xs text-yellow-700 space-y-1">
                        {uploadResult.not_found.map((rollNumber: string) => (
                          <div key={rollNumber}>• {rollNumber}</div>
                        ))}
                      </div>
                    </div>
                  )}

                <p className="text-sm text-slate-600 text-center">
                  Redirecting to trip dashboard...
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Upload Error
                  </p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
