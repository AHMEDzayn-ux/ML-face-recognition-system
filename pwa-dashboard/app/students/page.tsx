"use client";

import { useEffect, useState } from "react";
import { supabase, type Student } from "@/lib/supabase";
import {
  Users,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Trash2,
  Edit2,
  User as UserIcon,
} from "lucide-react";
import AddStudentForm from "@/components/AddStudentForm";
import DeleteStudentDialog from "@/components/DeleteStudentDialog";
import UpdateStudentDialog from "@/components/UpdateStudentDialog";
import { deleteStudent } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  // Track photo load error level per student:
  // 0 = untried, 1 = primary URL failed (try backend), 2 = all failed (show placeholder)
  const [photoErrorLevels, setPhotoErrorLevels] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name");

      if (error) throw error;
      setStudents(data || []);
      // Reset photo error state so photos are retried with fresh data
      setPhotoErrorLevels({});
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSuccess = () => {
    showNotification("success", "Student added successfully!");
    fetchStudents();
  };

  const handleEditSuccess = () => {
    showNotification("success", "Student updated successfully!");
    setStudentToEdit(null);
    fetchStudents();
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
      showNotification(
        "success",
        `Student ${studentToDelete.name} deleted successfully`,
      );
      setStudentToDelete(null);
      fetchStudents();
    } catch (error: any) {
      showNotification("error", error.message || "Failed to delete student");
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  /**
   * Resolve a student's photo URL for display.
   *
   * Priority:
   *  1. The stored photo_url (supports both full URLs and backend-relative paths like /api/students/.../photo)
   *  2. On failure: the backend endpoint directly
   *  3. On second failure: null → show placeholder icon
   */
  const resolvePhotoUrl = (student: Student): string | null => {
    const level = photoErrorLevels[student.id] || 0;
    const backendUrl = `${API_URL}/api/students/${student.id}/photo`;

    if (!student.photo_url || student.photo_url.trim() === "") {
      // No stored URL: use backend endpoint; if it already failed show placeholder
      return level >= 1 ? null : backendUrl;
    }

    // Resolve relative backend paths (e.g. "/api/students/{id}/photo")
    const primaryUrl = student.photo_url.startsWith("/")
      ? `${API_URL}${student.photo_url}`
      : student.photo_url;

    if (level === 0) return primaryUrl;
    if (level === 1) {
      // Primary failed; try backend endpoint unless it was already the primary
      return primaryUrl !== backendUrl ? backendUrl : null;
    }
    return null; // All attempts failed
  };

  const handlePhotoError = (studentId: string) => {
    setPhotoErrorLevels((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] || 0) + 1,
    }));
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-4 right-4 sm:right-4 sm:left-auto z-50 animate-in slide-in-from-top">
          <div
            className={`rounded-lg shadow-lg p-3 sm:p-4 max-w-sm sm:min-w-fit ${
              notification.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              {notification.type === "success" ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-xs sm:text-sm font-medium flex-1 ${
                  notification.type === "success"
                    ? "text-green-800 dark:text-green-300"
                    : "text-red-800 dark:text-red-300"
                }`}
              >
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="section-title text-2xl sm:text-3xl flex items-center gap-2 sm:gap-3">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-sky-700" />
            Students
          </h1>
          <p className="section-subtitle mt-2 text-xs sm:text-sm">
            {students.length} students enrolled
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl font-medium text-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Add Student
        </button>
      </div>

      <div className="mb-4 sm:mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search by name or roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-slate-300/70 bg-slate-50/85 py-2.5 sm:py-3 pr-4 pl-10 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="surface-card card-hover p-0 overflow-hidden relative group flex flex-col"
          >
            {/* Photo Section */}
            <div className="relative w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
              {(() => {
                const src = resolvePhotoUrl(student);
                return src ? (
                  <img
                    src={src}
                    alt={student.name}
                    className="w-full h-full object-cover"
                    onError={() => handlePhotoError(student.id)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="rounded-full bg-sky-100 p-4 sm:p-5">
                      <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-sky-700" />
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setStudentToEdit(student)}
                  className="p-2 sm:p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Edit student"
                >
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(student)}
                  className="p-2 sm:p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  title="Delete student"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {student.is_active ? (
                  <div className="flex items-center gap-1.5 bg-green-500 text-white px-2 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-xs font-semibold">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-500 text-white px-2 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-xs font-semibold">Inactive</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-0.5 line-clamp-1">
                {student.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-3">
                Roll: {student.roll_number}
              </p>

              {(student.class || student.section) && (
                <p className="text-xs sm:text-sm text-slate-600 mb-3">
                  {student.class} {student.section && `- ${student.section}`}
                </p>
              )}

              <div className="space-y-1.5 text-xs sm:text-sm mt-auto">
                {student.email && (
                  <div className="flex items-center text-slate-600 gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate text-xs">{student.email}</span>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center text-slate-600 gap-2">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate text-xs">{student.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="surface-muted text-center py-8 sm:py-12">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500">
            No students found
          </p>
        </div>
      )}

      {/* Add Student Form Modal */}
      <AddStudentForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Student Dialog */}
      <UpdateStudentDialog
        student={studentToEdit}
        isOpen={!!studentToEdit}
        onClose={() => setStudentToEdit(null)}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {studentToDelete && (
        <DeleteStudentDialog
          student={studentToDelete}
          isOpen={true}
          onClose={() => setStudentToDelete(null)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
