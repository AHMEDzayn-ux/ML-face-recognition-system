"use client";

import { useEffect, useState } from "react";
import {
  addParticipantToTrip,
  getStudents,
  getTripParticipants,
  removeParticipantFromTrip,
} from "@/lib/api";
import { Student } from "@/lib/supabase";
import {
  CheckCircle2,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

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
  const [tripStudentIds, setTripStudentIds] = useState<Set<string>>(new Set());
  const [tripParticipantIdsByStudentId, setTripParticipantIdsByStudentId] =
    useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, tripData] = await Promise.all([
        getStudents(),
        getTripParticipants(tripId),
      ]);

      setStudents(studentsData.students || []);

      const participants = tripData.participants || [];
      setTripStudentIds(
        new Set(participants.map((participant) => participant.student_id)),
      );
      setTripParticipantIdsByStudentId(
        new Map(
          participants.map((participant) => [
            participant.student_id,
            participant.id,
          ]),
        ),
      );
    } catch {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (student: Student) => {
    if (tripStudentIds.has(student.id)) {
      return;
    }

    setAdding(student.id);
    setError(null);
    setSuccess(null);

    try {
      const result = await addParticipantToTrip(
        tripId,
        student.id,
        student.roll_number,
      );

      setTripStudentIds((prev) => new Set(prev).add(student.id));
      if (result.participant?.id) {
        setTripParticipantIdsByStudentId((prev) => {
          const next = new Map(prev);
          next.set(student.id, result.participant.id);
          return next;
        });
      }

      setSuccess(`Added ${student.name} to trip!`);
      setTimeout(() => {
        setSuccess(null);
        onSuccess();
      }, 1200);
    } catch (err: any) {
      const message = String(err?.message || "");
      if (message.toLowerCase().includes("already in this trip")) {
        setTripStudentIds((prev) => new Set(prev).add(student.id));
        setSuccess(`${student.name} is already added`);
      } else {
        setError(message || "Failed to add participant");
      }
    } finally {
      setAdding(null);
    }
  };

  const handleRemoveParticipant = async (student: Student) => {
    const participantId = tripParticipantIdsByStudentId.get(student.id);

    if (!participantId) {
      return;
    }

    setRemoving(student.id);
    setError(null);
    setSuccess(null);

    try {
      await removeParticipantFromTrip(tripId, participantId);

      setTripStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
      setTripParticipantIdsByStudentId((prev) => {
        const next = new Map(prev);
        next.delete(student.id);
        return next;
      });

      setSuccess(`Removed ${student.name} from trip!`);
      setTimeout(() => {
        setSuccess(null);
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to remove participant");
    } finally {
      setRemoving(null);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Add Participants
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Search and add students to this trip
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        <div className="border-b border-slate-200 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            {success}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Search className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => {
                const isAdded = tripStudentIds.has(student.id);

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {student.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        {student.roll_number}
                      </div>
                      {student.class && (
                        <div className="mt-1 text-xs text-slate-500">
                          {student.class}
                          {student.section && ` - ${student.section}`}
                        </div>
                      )}
                      {isAdded && (
                        <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Added
                        </div>
                      )}
                    </div>

                    {isAdded ? (
                      <button
                        onClick={() => handleRemoveParticipant(student)}
                        disabled={removing === student.id}
                        className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removing === student.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4" />
                            Remove
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddParticipant(student)}
                        disabled={adding === student.id}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition-all hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
