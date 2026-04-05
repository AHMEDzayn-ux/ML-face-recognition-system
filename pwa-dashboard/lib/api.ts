const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to add ngrok bypass header for all requests
function getHeaders(): HeadersInit {
  return {
    'ngrok-skip-browser-warning': 'true',
  };
}

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
  const response = await fetch(`${API_URL}/students`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }
  return response.json();
}

export async function getTodayAttendance() {
  const response = await fetch(`${API_URL}/attendance/today`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch attendance');
  }
  return response.json();
}

export async function getAllAttendance() {
  const response = await fetch(`${API_URL}/attendance/all`, {
    headers: getHeaders(),
  });
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
  const response = await fetch(`${API_URL}/api/rebuild_status`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get rebuild status');
  }

  return response.json();
}

// ==================== TRIPS API ====================

export interface CreateTripData {
  name: string;
  description?: string;
  trip_date: string;
  departure_time?: string;
  created_by?: string;
}

export async function createTrip(tripData: CreateTripData): Promise<{
  success: boolean;
  trip?: any;
  message?: string;
}> {
  const formData = new FormData();
  formData.append('name', tripData.name);
  if (tripData.description) formData.append('description', tripData.description);
  formData.append('trip_date', tripData.trip_date);
  if (tripData.departure_time) formData.append('departure_time', tripData.departure_time);
  if (tripData.created_by) formData.append('created_by', tripData.created_by);

  const response = await fetch(`${API_URL}/api/trips`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create trip');
  }

  return response.json();
}

export async function getTrips(status?: string): Promise<{
  success: boolean;
  trips: any[];
  total: number;
}> {
  const url = status 
    ? `${API_URL}/api/trips?status=${status}`
    : `${API_URL}/api/trips`;
    
  const response = await fetch(url, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch trips');
  }
  
  return response.json();
}

export async function getTrip(tripId: string): Promise<{
  success: boolean;
  trip: any;
  stats: {
    total: number;
    checked_in: number;
    missing: number;
    percentage: number;
  };
  confirmations?: any[];
  selected_confirmation?: any;
}> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch trip');
  }
  
  return response.json();
}

export async function uploadTripCSV(tripId: string, file: File): Promise<{
  success: boolean;
  imported: number;
  not_found: string[];
  duplicates: number;
  total_processed: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/trips/${tripId}/upload-csv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload CSV');
  }

  return response.json();
}

export async function getTripParticipants(
  tripId: string,
  checkedIn?: boolean,
  confirmationId?: string
): Promise<{
  success: boolean;
  trip: any;
  stats: {
    total: number;
    checked_in: number;
    missing: number;
    percentage: number;
  };
  participants: any[];
  confirmations?: any[];
  selected_confirmation?: any;
}> {
  const params = new URLSearchParams();
  if (checkedIn !== undefined) params.set('checked_in', String(checkedIn));
  if (confirmationId) params.set('confirmation_id', confirmationId);
  const query = params.toString();
  const url = query
    ? `${API_URL}/api/trips/${tripId}/participants?${query}`
    : `${API_URL}/api/trips/${tripId}/participants`;

  const response = await fetch(url, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch trip participants');
  }
  
  return response.json();
}

export async function getTripConfirmations(tripId: string): Promise<{
  success: boolean;
  trip: any;
  confirmations: any[];
  selected_confirmation?: any;
}> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}/confirmations`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch trip confirmations');
  }

  return response.json();
}

export async function createTripConfirmation(
  tripId: string,
  confirmationData: {
    name: string;
    description?: string;
  },
): Promise<{
  success: boolean;
  confirmation?: any;
  message?: string;
}> {
  const formData = new FormData();
  formData.append('name', confirmationData.name);
  if (confirmationData.description) {
    formData.append('description', confirmationData.description);
  }

  const response = await fetch(`${API_URL}/api/trips/${tripId}/confirmations`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create confirmation');
  }

  return response.json();
}

export async function tripCheckin(
  tripId: string,
  imageFile: File,
  confirmationId?: string
): Promise<{
  success: boolean;
  participant?: {
    id: string;
    roll_number: string;
    name: string;
    confidence: number;
    check_in_time: string;
  };
  message?: string;
}> {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (confirmationId) formData.append('confirmation_id', confirmationId);

  const response = await fetch(`${API_URL}/api/trips/${tripId}/checkin`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to check in');
  }

  return response.json();
}

export async function markManualCheckin(
  tripId: string,
  participantId?: string,
  rollNumber?: string,
  notes?: string,
  confirmationId?: string
): Promise<{
  success: boolean;
  participant?: any;
  message?: string;
}> {
  const formData = new FormData();
  if (participantId) formData.append('participant_id', participantId);
  if (rollNumber) formData.append('roll_number', rollNumber);
  if (notes) formData.append('notes', notes);
  if (confirmationId) formData.append('confirmation_id', confirmationId);

  const response = await fetch(`${API_URL}/api/trips/${tripId}/mark-manual`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mark manual check-in');
  }

  return response.json();
}

export async function updateTripStatus(tripId: string, status: string): Promise<{
  success: boolean;
  trip?: any;
  message?: string;
}> {
  const formData = new FormData();
  formData.append('status', status);

  const response = await fetch(`${API_URL}/api/trips/${tripId}/status`, {
    method: 'PATCH',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update trip status');
  }

  return response.json();
}

export async function addParticipantToTrip(
  tripId: string,
  studentId?: string,
  rollNumber?: string
): Promise<{
  success: boolean;
  participant?: any;
  message?: string;
}> {
  // DETAILED LOGGING
  console.log("=".repeat(60));
  console.log("API CALL - addParticipantToTrip:");
  console.log("  tripId:", tripId);
  console.log("  studentId (raw):", studentId);
  console.log("  studentId type:", typeof studentId);
  console.log("  rollNumber:", rollNumber);
  
  const formData = new FormData();
  
  // Only append if value exists and is not empty
  if (studentId && studentId.trim()) {
    console.log("  ✅ Appending student_id:", studentId.trim());
    formData.append('student_id', studentId.trim());
  } else {
    console.log("  ❌ NOT appending student_id (empty or undefined)");
  }
  
  if (rollNumber && rollNumber.trim()) {
    console.log("  ✅ Appending roll_number:", rollNumber.trim());
    formData.append('roll_number', rollNumber.trim());
  } else {
    console.log("  ❌ NOT appending roll_number (empty or undefined)");
  }
  
  // Log FormData contents
  console.log("  FormData entries:");
  for (let [key, value] of formData.entries()) {
    console.log(`    ${key}:`, value);
  }
  console.log("  FormData has entries:", formData.entries().next().done === false);
  console.log("=".repeat(60));

  console.log("🌐 Sending POST to:", `${API_URL}/api/trips/${tripId}/add-participant`);

  const response = await fetch(`${API_URL}/api/trips/${tripId}/add-participant`, {
    method: 'POST',
    body: formData,
  });

  console.log("📥 Response status:", response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error("❌ API Error:", error);
    throw new Error(error.detail || 'Failed to add participant');
  }

  const result = await response.json();
  console.log("✅ API Success:", result);
  return result;
}

export async function removeParticipantFromTrip(
  tripId: string,
  participantId: string
): Promise<{
  success: boolean;
  message?: string;
}> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}/participants/${participantId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to remove participant');
  }

  return response.json();
}

export async function deleteTrip(tripId: string): Promise<{
  success: boolean;
  message?: string;
  trip_id?: string;
}> {
  const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete trip');
  }

  return response.json();
}
