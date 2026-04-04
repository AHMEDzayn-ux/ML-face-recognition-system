const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function markAttendance(imageFile: File): Promise<{
  success: boolean;
  name?: string;
  confidence?: number;
  message?: string;
}> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetch(`${API_URL}/mark_attendance`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to mark attendance');
  }

  return response.json();
}

export async function getStudents() {
  const response = await fetch(`${API_URL}/students`);
  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }
  return response.json();
}

export async function getTodayAttendance() {
  const response = await fetch(`${API_URL}/attendance/today`);
  if (!response.ok) {
    throw new Error('Failed to fetch attendance');
  }
  return response.json();
}

export async function getAllAttendance() {
  const response = await fetch(`${API_URL}/attendance/all`);
  if (!response.ok) {
    throw new Error('Failed to fetch all attendance');
  }
  return response.json();
}

// Student Management APIs

export interface CreateStudentData {
  roll_number: string;
  name: string;
  class_name?: string;
  section?: string;
  email?: string;
  phone?: string;
}

export async function createStudent(studentData: CreateStudentData): Promise<{
  success: boolean;
  student?: any;
  message?: string;
}> {
  const formData = new FormData();
  formData.append('roll_number', studentData.roll_number);
  formData.append('name', studentData.name);
  if (studentData.class_name) formData.append('class_name', studentData.class_name);
  if (studentData.section) formData.append('section', studentData.section);
  if (studentData.email) formData.append('email', studentData.email);
  if (studentData.phone) formData.append('phone', studentData.phone);

  const response = await fetch(`${API_URL}/api/students`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create student');
  }

  return response.json();
}

export async function uploadStudentPhotos(
  studentId: string,
  photos: File[]
): Promise<{
  success: boolean;
  photos_saved?: number;
  message?: string;
  failed_photos?: Array<{ filename: string; reason: string }>;
}> {
  const formData = new FormData();
  photos.forEach((photo) => {
    formData.append('photos', photo);
  });

  const response = await fetch(`${API_URL}/api/students/${studentId}/upload_photos`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload photos');
  }

  return response.json();
}

export async function deleteStudent(studentId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const response = await fetch(`${API_URL}/api/students/${studentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete student');
  }

  return response.json();
}

export async function rebuildEmbeddings(): Promise<{
  success: boolean;
  message?: string;
  status?: string;
}> {
  const response = await fetch(`${API_URL}/api/rebuild_embeddings`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to trigger embeddings rebuild');
  }

  return response.json();
}

export async function getRebuildStatus(): Promise<{
  status: {
    is_running: boolean;
    last_run: string | null;
    last_status: string;
  };
}> {
  const response = await fetch(`${API_URL}/api/rebuild_status`);

  if (!response.ok) {
    throw new Error('Failed to get rebuild status');
  }

  return response.json();
}
