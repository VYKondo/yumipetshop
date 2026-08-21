/**
 * Basic types shared between frontend and backend
 */
export declare enum UserRole {
    OWNER = "OWNER",
    STAFF = "STAFF"
}
export declare enum AppointmentStatus {
    SCHEDULED = "SCHEDULED",
    CONFIRMED = "CONFIRMED",
    DONE = "DONE",
    CANCELED = "CANCELED",
    NO_SHOW = "NO_SHOW"
}
export interface Petshop {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface User {
    id: string;
    petshopId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
}
export interface Dog {
    id: string;
    petshopId: string;
    name: string;
    breed: string | null;
    tutorName: string;
    tutorPhone: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Service {
    id: string;
    petshopId: string;
    name: string;
    basePrice: number | string;
    defaultDurationMin: number;
    active: boolean;
    createdAt: Date;
}
export interface Appointment {
    id: string;
    petshopId: string;
    dogId: string;
    serviceId: string;
    scheduledAt: Date;
    durationMin: number;
    price: number | string;
    taxidogPrice: number | string;
    notes: string | null;
    contactPhone: string;
    status: AppointmentStatus;
    whatsappReminderSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface MessageTemplate {
    id: string;
    petshopId: string;
    name: string;
    content: string;
    active: boolean;
    createdAt: Date;
}
export interface CreateAppointmentDto {
    dogId: string;
    serviceId: string;
    scheduledAt: string | Date;
    durationMin: number;
    price: number | string;
    taxidogPrice?: number | string;
    notes?: string;
    contactPhone?: string;
}
export interface UpdateAppointmentDto {
    dogId?: string;
    serviceId?: string;
    scheduledAt?: string | Date;
    durationMin?: number;
    price?: number | string;
    taxidogPrice?: number | string;
    notes?: string;
    contactPhone?: string;
}
export interface CreateMessageTemplateDto {
    name: string;
    content: string;
    active?: boolean;
}
export interface UpdateMessageTemplateDto {
    name?: string;
    content?: string;
    active?: boolean;
}
//# sourceMappingURL=index.d.ts.map