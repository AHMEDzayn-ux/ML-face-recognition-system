"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Download,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set default dates (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  // Fetch and preview record count when dates change
  useEffect(() => {
    if (startDate || endDate) {
      previewRecordCount();
    }
  }, [startDate, endDate]);

  async function previewRecordCount() {
    try {
      const query = supabase
        .from("attendance")
        .select("*", { count: "exact", head: true });

      if (startDate) query.gte("date", startDate);
      if (endDate) query.lte("date", endDate);

      const { count, error } = await query;
      if (error) throw error;
      setRecordCount(count || 0);
    } catch (err) {
      console.error("Error fetching count:", err);
      setRecordCount(null);
    }
  }

  async function fetchAttendanceData() {
    const query = supabase
      .from("attendance")
      .select("*")
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (startDate) query.gte("date", startDate);
    if (endDate) query.lte("date", endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function exportToExcel() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await fetchAttendanceData();

      if (data.length === 0) {
        setError("No attendance records found for the selected date range");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(
        data.map((record) => ({
          "Roll Number": record.roll_number,
          Name: record.name,
          Date: record.date,
          Time: record.time,
          Confidence: `${(record.confidence * 100).toFixed(1)}%`,
          Status: record.status,
        })),
      );

      // Set column widths
      worksheet["!cols"] = [
        { wch: 12 }, // Roll Number
        { wch: 20 }, // Name
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 12 }, // Confidence
        { wch: 10 }, // Status
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const filename = `attendance_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(workbook, filename);

      setSuccess(`Successfully exported ${data.length} records to Excel!`);
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      setError(`Failed to export: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function exportToPDF() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await fetchAttendanceData();

      if (data.length === 0) {
        setError("No attendance records found for the selected date range");
        return;
      }

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // Sky blue
      doc.text("Attendance Report", 14, 20);

      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(
        `Period: ${startDate || "Start"} to ${endDate || "End"}`,
        14,
        36,
      );
      doc.text(`Total Records: ${data.length}`, 14, 42);

      // Draw a line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 46, 196, 46);

      // Table using autoTable
      autoTable(doc, {
        startY: 50,
        head: [["Roll No", "Name", "Date", "Time", "Confidence", "Status"]],
        body: data.map((record) => [
          record.roll_number,
          record.name,
          record.date,
          record.time,
          `${(record.confidence * 100).toFixed(1)}%`,
          record.status.toUpperCase(),
        ]),
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Roll No
          1: { cellWidth: 45 }, // Name
          2: { cellWidth: 28 }, // Date
          3: { cellWidth: 22 }, // Time
          4: { cellWidth: 28 }, // Confidence
          5: { cellWidth: 22 }, // Status
        },
      });

      // Footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" },
        );
      }

      const filename = `attendance_${startDate}_to_${endDate}.pdf`;
      doc.save(filename);

      setSuccess(`Successfully exported ${data.length} records to PDF!`);
    } catch (error: any) {
      console.error("Error exporting to PDF:", error);
      setError(`Failed to export: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell max-w-4xl">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="section-title text-3xl flex items-center">
          <FileText className="w-8 h-8 mr-3 text-sky-700" />
          Reports
        </h1>
        <p className="section-subtitle mt-2">
          Export attendance data to Excel or PDF
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="surface-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-sky-700" />
          Select Date Range
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>
        </div>

        {/* Record Count Preview */}
        {recordCount !== null && (
          <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
            <p className="text-sm text-sky-900">
              📊 <strong>{recordCount}</strong> attendance record
              {recordCount !== 1 ? "s" : ""} found in this date range
            </p>
          </div>
        )}

        {/* Quick Date Presets */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const today = new Date();
              setStartDate(today.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastWeek = new Date();
              lastWeek.setDate(today.getDate() - 7);
              setStartDate(lastWeek.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastMonth = new Date();
              lastMonth.setDate(today.getDate() - 30);
              setStartDate(lastMonth.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDayOfMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
              );
              setStartDate(firstDayOfMonth.toISOString().split("T")[0]);
              setEndDate(today.toISOString().split("T")[0]);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            This Month
          </button>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Excel Export */}
        <div className="surface-card p-6">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-lg mr-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Excel Report
              </h3>
              <p className="text-sm text-slate-600">Download as .xlsx file</p>
            </div>
          </div>
          <ul className="mb-4 space-y-1 text-sm text-slate-600">
            <li>✓ Spreadsheet format</li>
            <li>✓ Easy data manipulation</li>
            <li>✓ Compatible with Excel, Google Sheets</li>
          </ul>
          <button
            onClick={exportToExcel}
            disabled={loading || recordCount === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Export to Excel
              </>
            )}
          </button>
        </div>

        {/* PDF Export */}
        <div className="surface-card p-6">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-lg mr-4">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                PDF Report
              </h3>
              <p className="text-sm text-slate-600">Download as .pdf file</p>
            </div>
          </div>
          <ul className="mb-4 space-y-1 text-sm text-slate-600">
            <li>✓ Professional printable format</li>
            <li>✓ Formatted tables and headers</li>
            <li>✓ Universal compatibility</li>
          </ul>
          <button
            onClick={exportToPDF}
            disabled={loading || recordCount === 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Export to PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 surface-muted p-6">
        <h3 className="mb-3 font-semibold text-sky-900 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Report Features
        </h3>
        <ul className="space-y-2 text-sm text-sky-800">
          <li>
            • <strong>Date Filtering:</strong> Select custom date range or use
            quick presets
          </li>
          <li>
            • <strong>Excel Format:</strong> Includes roll number, name, date,
            time, confidence, and status
          </li>
          <li>
            • <strong>PDF Format:</strong> Professional layout with headers,
            formatted tables, and page numbers
          </li>
          <li>
            • <strong>Real-time Preview:</strong> See how many records will be
            exported before downloading
          </li>
          <li>
            • <strong>Sorted Data:</strong> Records sorted by date and time
            (newest first)
          </li>
        </ul>
      </div>
    </div>
  );
}
