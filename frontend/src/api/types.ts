export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'REVIEWER';
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}
