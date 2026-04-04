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
} from "lucide-react";
import AddStudentForm from "@/components/AddStudentForm";
import DeleteStudentDialog from "@/components/DeleteStudentDialog";
import { deleteStudent } from "@/lib/api";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div
            className={`rounded-lg shadow-lg p-4 min-w-[300px] ${
              notification.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <p
                className={`text-sm font-medium ${
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

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="section-title text-3xl flex items-center">
            <Users className="w-8 h-8 mr-3 text-sky-700" />
            Students
          </h1>
          <p className="section-subtitle mt-2">
            {students.length} students enrolled
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300/70 bg-slate-50/85 py-3 pr-4 pl-10 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="surface-card card-hover p-6 relative group"
          >
            {/* Delete Button */}
            <button
              onClick={() => handleDeleteClick(student)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Delete student"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-start justify-between mb-4">
              <div className="bg-sky-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-sky-700" />
              </div>
              <div>
                {student.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {student.name}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Roll: {student.roll_number}
            </p>

            {(student.class || student.section) && (
              <p className="text-sm text-slate-600 mb-4">
                {student.class} {student.section && `- ${student.section}`}
              </p>
            )}

            <div className="space-y-2 text-sm">
              {student.email && (
                <div className="flex items-center text-slate-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {student.email}
                </div>
              )}
              {student.phone && (
                <div className="flex items-center text-slate-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {student.phone}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="surface-muted text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No students found</p>
        </div>
      )}

      {/* Add Student Form Modal */}
      <AddStudentForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={handleAddSuccess}
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
