// Mapped from 'property_types' table
export interface PropertyType {
    id: string;
    name: string;
    label: string;
}

export interface PropertyOwnerReference {
    owner_id: string;
    name: string;
    participation_percentage: number;
}

export interface Property {
    id: string;
    name: string;
    // Normalized relationship
    property_type_id: string;
    property_type?: PropertyType; // Joined data

    address: string;
    total_area?: number | null;
    floors?: number | null;
    description?: string | null;
    created_at?: string;
    // Relationships
    units?: Unit[];
    owners?: PropertyOwnerReference[]; // Many-to-Many via property_owners
}

export type UnitType = 'apartment' | 'office' | 'local' | 'storage';
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';

export interface Unit {
    id: string;
    property_id: string;
    name: string;
    type: UnitType;
    floor?: string | null;
    area?: number | null;
    default_rent_amount?: number | null;
    status: UnitStatus;
    // Computed fields
    isOccupied?: boolean;
    tenantName?: string;
}
