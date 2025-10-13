import { Document } from 'mongoose';
export declare class Address {
    city: string;
    district: string;
    ward: string;
    street: string;
}
export declare const AddressSchema: import("mongoose").Schema<Address, import("mongoose").Model<Address, any, any, any, Document<unknown, any, Address, any, {}> & Address & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Address, Document<unknown, {}, import("mongoose").FlatRecord<Address>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Address> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Email {
    email_address: string;
    verified: boolean;
}
export declare const EmailSchema: import("mongoose").Schema<Email, import("mongoose").Model<Email, any, any, any, Document<unknown, any, Email, any, {}> & Email & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Email, Document<unknown, {}, import("mongoose").FlatRecord<Email>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Email> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Phone {
    phone_number: string;
    verified: boolean;
}
export declare const PhoneSchema: import("mongoose").Schema<Phone, import("mongoose").Model<Phone, any, any, any, Document<unknown, any, Phone, any, {}> & Phone & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Phone, Document<unknown, {}, import("mongoose").FlatRecord<Phone>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Phone> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare enum RegisterStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class Clinic_Register {
    id: string;
    user_id: string;
    clinic_name: string;
    email: Email;
    phone: Phone;
    license_number: string;
    address: Address;
    established_year: number;
    description: string;
    logo_url: string;
    website?: string;
    status: RegisterStatus;
    note?: string;
}
export type ClinicRegisterDocument = Clinic_Register & Document;
export declare const ClinicRegisterSchema: import("mongoose").Schema<Clinic_Register, import("mongoose").Model<Clinic_Register, any, any, any, Document<unknown, any, Clinic_Register, any, {}> & Clinic_Register & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Clinic_Register, Document<unknown, {}, import("mongoose").FlatRecord<Clinic_Register>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Clinic_Register> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
