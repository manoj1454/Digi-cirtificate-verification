import { supabase } from './supabase';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const API_BASE = rawApiBase.replace(/\/+$/, '');

async function getAuthHeaders() {
  const headers = {};
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  // If demo role active or user stored in local storage
  const demoRole = localStorage.getItem('veriCert_demo_role');
  if (demoRole && !session) {
    headers['x-user-id'] = `demo-${demoRole}-uuid`;
    headers['x-user-role'] = demoRole;
  }
  return headers;
}

export async function fetchInstitutions() {
  const res = await fetch(`${API_BASE}/api/institutions`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch institutions');
  return data.institutions || [];
}

export async function fetchMyInstitution() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/institutions/my-institution`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch institution profile');
  return data.institution;
}

export async function approveInstitution(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/institutions/${id}/approve`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve institution');
  return data;
}

export async function rejectInstitution(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/institutions/${id}/reject`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reject institution');
  return data;
}

export async function updateInstitutionAccreditation(id, accredited) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}/api/institutions/${id}/accreditation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ accredited }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update accreditation');
  return data;
}

export async function fetchStudents(institutionId) {
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/students`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch students');
  return data.students || [];
}

export async function addStudent(institutionId, studentData) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/students`, {
    method: 'POST',
    headers,
    body: JSON.stringify(studentData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add student');
  return data.student;
}

export async function fetchPendingCertificates(institutionId) {
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/certificates/pending`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch pending certificates');
  return data.pendingCertificates || [];
}

export async function fetchIssuedCertificates(institutionId) {
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/certificates/issued`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch issued certificates');
  return data.certificates || [];
}

export async function initiateCertificate(formData) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/certificates/initiate`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to initiate certificate');
  return data.pendingCertificate;
}

export async function approveCertificate(pendingId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/certificates/${pendingId}/approve`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve certificate');
  return data;
}

export async function verifyCertificate(credentialId) {
  const res = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(credentialId)}`);
  const data = await res.json();
  return { status: res.status, data };
}

export async function logVerificationAttempt(logData) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  try {
    await fetch(`${API_BASE}/api/certificates/verify-log`, {
      method: 'POST',
      headers,
      body: JSON.stringify(logData),
    });
  } catch (e) {
    // Non-blocking log
  }
}

export async function fetchStudentCertificates() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/students/certificates`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch student certificates');
  return data;
}

export async function inviteStaff(institutionId, staffData) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  console.log('[api.inviteStaff] sending request to:', `${API_BASE}/api/institutions/${institutionId}/invite-staff`, staffData, headers);
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/invite-staff`, {
    method: 'POST',
    headers,
    body: JSON.stringify(staffData),
  });
  const data = await res.json();
  console.log('[api.inviteStaff] result status:', res.status, data);
  if (!res.ok) throw new Error(data.error || 'Failed to invite staff member');
  return data;
}

export async function fetchInstitutionStaff(institutionId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/staff`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch staff members');
  return data.staff || [];
}

export async function fetchInstitutionStats(institutionId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/institutions/${institutionId}/stats`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch institution stats');
  return data.stats || null;
}

export async function revokeCertificate(certId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/certificates/${encodeURIComponent(certId)}/revoke`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to revoke certificate');
  return data;
}
