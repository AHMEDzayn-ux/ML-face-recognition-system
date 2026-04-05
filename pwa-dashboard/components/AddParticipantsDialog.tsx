"use client";

import { useState, useEffect } from "react";
import { getStudents, addParticipantToTrip } from "@/lib/api";
import { Student } from "@/lib/supabase";
import { X, Search, UserPlus, Loader2, CheckCircle2 } from "lucide-react";

interface AddParticipantsDialogProps {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddParticipantsDialog({
  tripId,
  onClose,
  onSuccess,
}: AddParticipantsDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getStudents();
      setStudents(data.students || []);
    } catch (err) {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (student: Student) => {
    setAdding(student.id);
    setError(null);
    setSuccess(null);

    // DETAILED LOGGING
    console.log("=".repeat(60));
    console.log("ADD PARTICIPANT - FRONTEND:");
    console.log("  tripId:", tripId);
    console.log("  student (full object):", JSON.stringify(student, null, 2));
    console.log("  student.id:", student.id);
    console.log("  student.id type:", typeof student.id);
    console.log("  student.roll_number:", student.roll_number);
    console.log("  Has student.id?", student.hasOwnProperty('id'));
    console.log("  student.id === undefined?", student.id === undefined);
    console.log("  student.id === null?", student.id === null);
    console.log("=".repeat(60));

    try {
      // Try with both parameters as workaround
      const result = await addParticipantToTrip(tripId, student.id, student.roll_number);
      console.log("✅ Add participant result:", result);
      setSuccess(`Added ${student.name} to trip!`);

      // Remove from list
      setStudents((prev) => prev.filter((s) => s.id !== student.id));

      setTimeout(() => {
        setSuccess(null);
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error("❌ Add participant error:", err);
      setError(err.message || "Failed to add participant");
    } finally {
      setAdding(null);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Add Participants
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Search and add students to this trip
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Search className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {student.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {student.roll_number}
                    </div>
                    {student.class && (
                      <div className="text-xs text-slate-500 mt-1">
                        {student.class}{" "}
                        {student.section && `- ${student.section}`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddParticipant(student)}
                    disabled={adding === student.id}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adding === student.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
