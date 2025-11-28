import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as uuid from 'uuid';
import { createRpcError } from 'src/common/error.detail';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  CancelAppointmentDto,
  CreateAppointmentForCustomerDto,
} from 'src/dto/appointment.dto';
import { CreateMedicalRecordDto } from 'src/dto/medical_record.dto';
import { AppointmentRepository } from '../repositories/appointment.repositories';
import {
  Appointment,
  AppointmentStatus,
  AppointmentShift,
  AppointmentCreatedBy,
} from 'src/schemas/appoinment.schema';
import { lastValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from 'src/schemas/medical_record.schema';
import { Medication, MedicationDocument } from 'src/schemas/preciption.schema';

@Injectable()
export class AppointmentService {
  constructor(
    @Inject('PARTNER_SERVICE')
    private readonly partnerService: ClientProxy,
    @Inject('CUSTOMER_SERVICE')
    private readonly customerService: ClientProxy,
    @Inject('PETCARE_SERVICE')
    private readonly petcareService: ClientProxy,
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
    private readonly appointmentRepositories: AppointmentRepository,
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecordDocument>,
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<MedicationDocument>,
  ) { }

  // Helper function để kiểm tra role (hỗ trợ cả string và array)
  private hasRole(userRole: string | string[], targetRole: string): boolean {
    if (Array.isArray(userRole)) {
      return userRole.some((r) => r === targetRole);
    }
    return userRole === targetRole;
  }

  // Helper function để kiểm tra có phải Admin hoặc Staff không
  private isAdminOrStaff(userRole: string | string[]): boolean {
    return this.hasRole(userRole, 'Admin') || this.hasRole(userRole, 'Staff');
  }

  async getTodayAppointmentsForClinic(
    clinicId: string,
    statuses: AppointmentStatus[] = [
      AppointmentStatus.Pending_Confirmation,
      AppointmentStatus.Confirmed,
      AppointmentStatus.In_Progress,
    ],
    date?: Date,
  ): Promise<Appointment[]> {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const statusValues = statuses.map((s) => s as unknown as string);

      const appointments =
        await this.appointmentRepositories.findByClinicAndDateAndStatuses(
          clinicId,
          targetDate,
          statusValues,
        );

      return appointments as any;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          error.message ||
          'Lỗi khi lấy danh sách lịch hẹn hôm nay cho phòng khám',
      });
    }
  }

  async assignVetAndStart(
    appointmentId: string,
    vetId: string,
  ): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      if (!appointment.pet_ids || appointment.pet_ids.length === 0) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Không thể phân công bác sĩ cho lịch hẹn chưa có pet',
        });
      }

      // Chỉ cho phép gán bác sĩ khi lịch hẹn đã được xác nhận hoặc khách đã check-in
      if (
        appointment.status !== AppointmentStatus.Confirmed &&
        appointment.status !== AppointmentStatus.Checked_In
      ) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message:
            'Chỉ có thể gán bác sĩ cho lịch hẹn ở trạng thái Confirmed hoặc Checked_In',
        });
      }

      const updated = await this.appointmentRepositories.update(appointmentId, {
        vet_id: vetId,
        status: AppointmentStatus.In_Progress,
      } as Partial<Appointment>);

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể cập nhật lịch hẹn',
        });
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi gán bác sĩ và bắt đầu lịch hẹn',
      });
    }
  }

  async createMedicalRecordWithMedications(
    appointmentId: string,
    data: CreateMedicalRecordDto,
  ): Promise<{ medicalRecord: MedicalRecord; medications: Medication[] }> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      if (appointment.id !== data.appointment_id) {
        data.appointment_id = appointment.id;
      }

      // Tự động lấy clinic_id từ appointment
      data.clinic_id = appointment.clinic_id;

      // Tự động lấy vet_id từ appointment nếu có (đảm bảo tính nhất quán)
      if (appointment.vet_id) {
        data.vet_id = appointment.vet_id;
      }

      if (!appointment.pet_ids || !appointment.pet_ids.includes(data.pet_id)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'pet_id không thuộc lịch hẹn này',
        });
      }

      // Đảm bảo mỗi lịch hẹn chỉ có một hồ sơ bệnh án chính
      const existingRecord = await this.medicalRecordModel
        .findOne({ appointment_id: appointment.id })
        .lean();

      if (existingRecord) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Lịch hẹn này đã có hồ sơ bệnh án',
        });
      }

      const medicalRecord = await this.medicalRecordModel.create({
        appointment_id: data.appointment_id,
        pet_id: data.pet_id,
        vet_id: data.vet_id,
        clinic_id: data.clinic_id,
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        notes: data.notes,
      });

      const medicationsPayload = data.medications.map((m) => ({
        medical_record_id: medicalRecord.id,
        medication_name: m.medication_name,
        dosage: m.dosage,
        instructions: m.instructions,
      }));

      const medications =
        medicationsPayload.length > 0
          ? await this.medicationModel.insertMany(medicationsPayload)
          : [];

      try {
        await lastValueFrom(
          this.petcareService.send(
            { cmd: 'addMedicalRecordToPet' },
            {
              pet_id: data.pet_id,
              medical_record_id: medicalRecord.id,
            },
          ),
        );
      } catch (err) { }

      return {
        medicalRecord: medicalRecord.toJSON() as any,
        medications: medications as any,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          error.message || 'Lỗi khi tạo hồ sơ bệnh án và danh sách thuốc',
      });
    }
  }

  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      if (appointment.status !== AppointmentStatus.Pending_Confirmation) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message:
            'Chỉ có thể xác nhận lịch hẹn ở trạng thái Pending_Confirmation',
        });
      }

      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Confirmed,
      );

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể xác nhận lịch hẹn',
        });
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi xác nhận lịch hẹn',
      });
    }
  }

  async checkInAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      if (appointment.status !== AppointmentStatus.Confirmed) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Chỉ có thể check-in lịch hẹn ở trạng thái Confirmed',
        });
      }

      if (!appointment.pet_ids || appointment.pet_ids.length === 0) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message:
            'Lịch hẹn chưa có pet. Vui lòng tạo pet cho khách và gán vào lịch hẹn trước khi check-in',
        });
      }

      const updated = await this.appointmentRepositories.update(appointmentId, {
        status: AppointmentStatus.Checked_In,
        checked_in_at: new Date(),
      } as Partial<Appointment>);

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể check-in lịch hẹn',
        });
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi check-in lịch hẹn',
      });
    }
  }

  async completeAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      if (appointment.status === AppointmentStatus.Cancelled) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Không thể hoàn thành lịch hẹn đã bị hủy',
        });
      }

      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Completed,
      );

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể cập nhật trạng thái hoàn thành cho lịch hẹn',
        });
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi hoàn thành lịch hẹn',
      });
    }
  }

  async assignPetToAppointment(
    appointmentId: string,
    petId: string,
    clinicId?: string,
  ): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      if (clinicId && appointment.clinic_id !== clinicId) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Bạn không có quyền chỉnh sửa lịch hẹn của phòng khám khác',
        });
      }

      const pet: any = await lastValueFrom(
        this.petcareService.send({ cmd: 'getPetById' }, { pet_id: petId }),
      );

      if (!pet || (pet as any).error) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy pet',
        });
      }

      const ownerId = (pet as any).owner_id || (pet as any).user_id;
      if (ownerId && appointment.user_id && ownerId !== appointment.user_id) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Pet không thuộc quyền sở hữu của khách đặt lịch',
        });
      }

      const currentPetIds = Array.isArray(appointment.pet_ids)
        ? appointment.pet_ids
        : [];
      const newPetIds = Array.from(new Set([...currentPetIds, petId]));

      const updated = await this.appointmentRepositories.update(appointmentId, {
        pet_ids: newPetIds,
      } as Partial<Appointment>);

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể gán pet cho lịch hẹn',
        });
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi gán pet cho lịch hẹn',
      });
    }
  }

  async getMedicalRecordsByPet(
    petId: string,
    role?: string | string[],
    clinicId?: string,
    vetId?: string,
  ): Promise<{ medicalRecord: MedicalRecord; medications: Medication[] }[]> {
    try {
      // Nếu là Vet thì chỉ được xem hồ sơ:
      // - Thuộc clinic của mình
      // - Do chính mình tạo (vet_id = vetId)
      // - Và chỉ khi đang có ít nhất một lịch hẹn ACTIVE cho pet đó, clinic đó, vet đó
      if (role && this.hasRole(role, 'Vet')) {
        if (!clinicId || !vetId) {
          return [];
        }

        const activeStatuses = [AppointmentStatus.In_Progress].map(
          (s) => s as unknown as string,
        );

        const hasActiveAppointment =
          await this.appointmentRepositories.existsActiveForClinicPetVet(
            clinicId,
            petId,
            vetId,
            activeStatuses,
          );

        if (!hasActiveAppointment) {
          return [];
        }

        const records = await this.medicalRecordModel
          .find({ pet_id: petId, vet_id: vetId, clinic_id: clinicId })
          .sort({ createdAt: -1 })
          .lean();

        if (!records || records.length === 0) {
          return [];
        }

        const recordIds = records.map((r: any) => r.id);

        const medications = await this.medicationModel
          .find({ medical_record_id: { $in: recordIds } })
          .sort({ createdAt: -1 })
          .lean();

        const medsByRecord: Record<string, any[]> = {};
        for (const m of medications) {
          const key = m.medical_record_id;
          if (!medsByRecord[key]) {
            medsByRecord[key] = [];
          }
          medsByRecord[key].push(m);
        }

        return records.map((r: any) => ({
          medicalRecord: r as any,
          medications: (medsByRecord[r.id] || []) as any,
        }));
      }

      const records = await this.medicalRecordModel
        .find({ pet_id: petId })
        .sort({ createdAt: -1 })
        .lean();

      if (!records || records.length === 0) {
        return [];
      }

      const recordIds = records.map((r: any) => r.id);

      const medications = await this.medicationModel
        .find({ medical_record_id: { $in: recordIds } })
        .sort({ createdAt: -1 })
        .lean();

      const medsByRecord: Record<string, any[]> = {};
      for (const m of medications) {
        const key = m.medical_record_id;
        if (!medsByRecord[key]) {
          medsByRecord[key] = [];
        }
        medsByRecord[key].push(m);
      }

      return records.map((r: any) => ({
        medicalRecord: r as any,
        medications: (medsByRecord[r.id] || []) as any,
      }));
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy hồ sơ bệnh án theo pet',
      });
    }
  }

  async createAppointment(
    data: CreateAppointmentDto,
    user_id: string,
  ): Promise<any> {
    const { clinic_id, service_ids, pet_ids, shift_id, date } = data;
    console.log('createAppointment received data:', JSON.stringify(data));
    console.log('createAppointment extracted pet_ids:', pet_ids);
    const appointmentDate = new Date(date);
    const now = new Date();
    const appointmentDateStart = new Date(appointmentDate).setHours(0, 0, 0, 0);
    const todayStart = new Date(now).setHours(0, 0, 0, 0);

    if (appointmentDateStart < todayStart) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message:
          'Bạn chỉ có thể đặt lịch hẹn trong ngày hiện tại hoặc tương lai',
      });
    }

    const hasServices = Array.isArray(service_ids) && service_ids.length > 0;

    try {
      const clinic = await lastValueFrom(
        this.partnerService.send({ cmd: 'getClinicById' }, { id: clinic_id }),
      ).catch((err) => {
        console.error('❌ Error getClinicById:', err);
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Lỗi khi lấy thông tin phòng khám',
        });
      });
      console.log('>>> [createAppointment] clinic:', JSON.stringify(clinic));

      let services: any[] = [];
      if (hasServices) {
        console.log('>>> [createAppointment] BEFORE validateClinicServices');
        services = await lastValueFrom(
          this.partnerService.send(
            { cmd: 'validateClinicServices' },
            { clinic_id, service_ids },
          ),
        ).catch((err) => {
          console.error('❌ Error validateClinicServices:', err);
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message:
              'Lỗi khi xác thực dịch vụ hoặc dịch vụ không thuộc phòng khám này',
          });
        });
        console.log(
          '>>> [createAppointment] services:',
          JSON.stringify(services),
        );
      } else {
        console.log('>>> [createAppointment] skip validateClinicServices');
      }

      console.log('>>> [createAppointment] BEFORE getClinicShiftById');
      const shift = await lastValueFrom(
        this.partnerService.send(
          { cmd: 'getClinicShiftById' },
          { clinic_id, shift_id },
        ),
      ).catch((err) => {
        console.error('❌ Error getClinicShiftById:', err);
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Lỗi khi lấy thông tin ca khám',
        });
      });
      console.log('>>> [createAppointment] shift:', JSON.stringify(shift));

      // Validate Clinic
      if (!clinic || clinic.is_active === false) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Phòng khám không tồn tại hoặc đã ngừng hoạt động',
        });
      }

      if (hasServices) {
        if (!services || services.length !== service_ids.length) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Dịch vụ không hợp lệ hoặc không thuộc phòng khám này',
          });
        }
      }

      // Validate Shift
      if (!shift) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Ca khám không tồn tại hoặc không thuộc phòng khám này',
        });
      }

      const user = await lastValueFrom(
        this.customerService.send({ cmd: 'getUserById' }, { id: user_id }),
      ).catch(() => null);

      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy thông tin người dùng',
        });
      }

      const userRole = user.role || [];
      const isUserRole = this.hasRole(userRole, 'User');
      const isPartnerRole =
        this.hasRole(userRole, 'Clinic') ||
        this.hasRole(userRole, 'Staff') ||
        this.hasRole(userRole, 'Admin');

      const newAppointmentData: any = {
        ...data,
        user_id,
        date: appointmentDate,
        shift: shift.data.shift,
        status: AppointmentStatus.Pending_Confirmation,
        service_ids: hasServices ? service_ids : [],
        pet_ids: pet_ids && pet_ids.length > 0 ? pet_ids : [],
      };
      console.log('newAppointmentData:', JSON.stringify(newAppointmentData));
      if (isUserRole) {
        newAppointmentData.customer = user_id;
        newAppointmentData.created_by = AppointmentCreatedBy.Customer;
      } else if (isPartnerRole) {
        newAppointmentData.partner = user_id;
        newAppointmentData.created_by = AppointmentCreatedBy.Partner;
      }

      const result =
        await this.appointmentRepositories.create(newAppointmentData);
      console.log('result123123fdsdf:', JSON.stringify(result));
      const appointmentDateFormatted = appointmentDate.toLocaleDateString(
        'vi-VN',
        { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' },
      );

      try {
        const userEmail = user.email?.email_address || user.email;
        const userName = user.full_name || user.username || 'Quý khách';
        const serviceNames =
          services && services.length > 0
            ? services.map((s) => s.name)
            : ['Khám tổng quát/Chưa chỉ định'];

        await lastValueFrom(
          this.authService.send(
            { cmd: 'sendAppointmentConfirmation' },
            {
              email: userEmail,
              appointmentDetails: {
                userName: userName,
                appointmentDate: appointmentDateFormatted,
                appointmentTime: `${shift.data.start_time} - ${shift.data.end_time}`,
                clinicName: clinic.data.clinic_name,
                clinicAddress: clinic.data.address,
                services: serviceNames,
                appointmentId: result.id,
              },
            },
          ),
        );
      } catch (emailError) {
        console.error('Không thể gửi email xác nhận:', emailError);
      }

      return result;
    } catch (error) {
      if (error.code === 11000) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Lịch hẹn của bạn bị trùng lặp.',
        });
      }
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error creating appointment:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi không xác định khi tạo lịch hẹn',
      });
    }
  }

  async getAppointments(
    role: string | string[],
    userId?: string,
    clinicId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    status: string;
    message: string;
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      let result: { data: any[]; total: number };

      // Phân quyền dựa trên role
      if (this.hasRole(role, 'User')) {
        // USER: chỉ xem appointments của chính mình
        if (!userId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin người dùng',
          });
        }
        result = await this.appointmentRepositories.findByUserId(
          userId,
          page,
          limit,
        );
      } else if (this.hasRole(role, 'Clinic')) {
        // CLINIC: xem appointments của phòng khám mình
        if (!clinicId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin phòng khám',
          });
        }
        result = await this.appointmentRepositories.findByClinicId(
          clinicId,
          page,
          limit,
        );
      } else if (this.isAdminOrStaff(role)) {
        // ADMIN/STAFF: xem tất cả appointments
        result = await this.appointmentRepositories.findAll(page, limit);
      } else {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Không có quyền truy cập',
        });
      }

      const totalPages = Math.ceil(result.total / limit);

      return {
        status: 'success',
        message: 'Lấy danh sách lịch hẹn thành công',
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy danh sách lịch hẹn',
      });
    }
  }

  async getMyAppointments(vetId: string): Promise<Appointment[]> {
    try {
      const activeStatuses = [
        AppointmentStatus.Checked_In,
        AppointmentStatus.In_Progress,
      ].map((s) => s as unknown as string);

      const appointments =
        await this.appointmentRepositories.findByVetAndStatuses(
          vetId,
          activeStatuses,
        );

      return appointments as any;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          error.message || 'Lỗi khi lấy danh sách lịch hẹn của bác sĩ thú y',
      });
    }
  }

  async updateAppointmentStatus(
    appointmentId: string,
    updateData: UpdateAppointmentStatusDto,
    updatedByUserId?: string,
    role?: string | string[],
    clinicId?: string,
  ): Promise<any> {
    try {
      // Kiểm tra appointment có tồn tại không
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      // Authorization check (nếu có role)
      if (role) {
        if (this.hasRole(role, 'User')) {
          // USER: chỉ cập nhật status của appointment của chính mình
          if (!updatedByUserId) {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Thiếu thông tin người dùng',
            });
          }
          if (appointment.user_id !== updatedByUserId) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message: 'Bạn không có quyền cập nhật trạng thái lịch hẹn này',
            });
          }
        } else if (this.hasRole(role, 'Clinic')) {
          // CLINIC: chỉ cập nhật status của appointment của phòng khám mình
          if (!clinicId) {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Thiếu thông tin phòng khám',
            });
          }
          if (appointment.clinic_id !== clinicId) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message:
                'Bạn không có quyền cập nhật trạng thái lịch hẹn của phòng khám khác',
            });
          }
        } else if (!this.isAdminOrStaff(role)) {
          // Các role khác không có quyền
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền cập nhật trạng thái lịch hẹn',
          });
        }
        // Admin/Staff có thể cập nhật tất cả
      }

      // Nếu cập nhật thành Cancelled và có userId, lưu cancelled_by
      const cancelledBy =
        updateData.status === AppointmentStatus.Cancelled && updatedByUserId
          ? updatedByUserId
          : undefined;

      // Cập nhật trạng thái
      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        updateData.status,
        updateData.cancel_reason,
        cancelledBy,
      );

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể cập nhật trạng thái lịch hẹn',
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi cập nhật trạng thái lịch hẹn',
      });
    }
  }

  async cancelAppointment(
    appointmentId: string,
    cancelledByUserId: string,
    role: string | string[],
    cancelData: CancelAppointmentDto,
    clinicId?: string,
  ): Promise<any> {
    try {
      // Kiểm tra appointment có tồn tại không
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      // Phân quyền: kiểm tra ai có quyền hủy
      if (this.hasRole(role, 'User')) {
        // USER: chỉ hủy được appointment của chính mình
        if (appointment.user_id !== cancelledByUserId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền hủy lịch hẹn này',
          });
        }
      } else if (this.hasRole(role, 'Clinic')) {
        // CLINIC: chỉ hủy được appointment của phòng khám mình
        if (!clinicId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin phòng khám',
          });
        }
        if (appointment.clinic_id !== clinicId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền hủy lịch hẹn này',
          });
        }
      } else if (!this.isAdminOrStaff(role)) {
        // ADMIN/STAFF: hủy được tất cả, các role khác không có quyền
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Bạn không có quyền hủy lịch hẹn',
        });
      }

      // Kiểm tra appointment chưa bị hủy hoặc đã hoàn thành
      if (appointment.status === AppointmentStatus.Cancelled) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Lịch hẹn này đã bị hủy trước đó',
        });
      }

      if (appointment.status === AppointmentStatus.Completed) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Không thể hủy lịch hẹn đã hoàn thành',
        });
      }

      // Lấy lý do hủy từ cancelData (có thể là string hoặc undefined)
      const cancelReason = cancelData?.cancel_reason;

      // Log để debug
      console.log('Cancel reason:', cancelReason, 'Type:', typeof cancelReason);

      // Nếu status là Confirmed thì bắt buộc phải có lý do hủy
      if (appointment.status === AppointmentStatus.Confirmed) {
        if (!cancelReason || cancelReason.trim() === '') {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message:
              'Lịch hẹn đã được xác nhận, vui lòng nhập lý do hủy lịch hẹn',
          });
        }
      }

      // Cập nhật trạng thái thành Cancelled, lưu lý do (nếu có) và id người hủy
      // Nếu cancelReason là empty string, vẫn lưu (có thể là người dùng muốn xóa lý do cũ)
      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Cancelled,
        cancelReason, // Có thể là string, empty string, hoặc undefined
        cancelledByUserId,
      );

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể hủy lịch hẹn',
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi hủy lịch hẹn',
      });
    }
  }

  async getAppointmentById(
    appointmentId: string,
    role: string | string[],
    userId?: string,
    clinicId?: string,
  ): Promise<any> {
    try {
      // 1. Tìm appointment
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      // 2. Kiểm tra quyền (Check Authorization)
      if (this.hasRole(role, 'User')) {
        if (!userId)
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin người dùng',
          });

        const appointmentCustomer =
          (appointment as any).customer ??
          (appointment as any).customer_id ??
          (appointment as any).customerId;
        if (appointment.user_id !== userId && appointmentCustomer !== userId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền xem lịch hẹn này',
          });
        }
      } else if (this.hasRole(role, 'Clinic')) {
        if (!clinicId)
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin phòng khám',
          });
        if (appointment.clinic_id !== clinicId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền xem lịch hẹn này',
          });
        }
      } else if (this.hasRole(role, 'Vet')) {
        if (!userId)
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin người dùng',
          });

        if (appointment.vet_id !== userId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền xem lịch hẹn này',
          });
        }
      } else if (!this.isAdminOrStaff(role)) {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Không có quyền truy cập',
        });
      }

      // 3. Chuẩn bị Promise để gọi Microservice
      const promises: Promise<any>[] = [
        // [0] Lấy thông tin Clinic
        lastValueFrom(
          this.partnerService.send(
            { cmd: 'getClinicById' },
            { id: appointment.clinic_id },
          ),
        ),
        // [1] Lấy danh sách TOÀN BỘ dịch vụ của Clinic đó (để tí nữa lọc)
        lastValueFrom(
          this.partnerService.send(
            { cmd: 'getServicesByClinicId' },
            { clinic_id: appointment.clinic_id },
          ),
        ),
        // [2] Lấy thông tin User
        lastValueFrom(
          this.customerService.send(
            { cmd: 'getUserById' },
            { id: appointment.user_id },
          ),
        ),
      ];

      // [2] Xử lý Pet: Kiểm tra xem có pet_ids không rồi mới gọi
      const hasPets = appointment.pet_ids && appointment.pet_ids.length > 0;

      if (hasPets) {
        // QUAN TRỌNG: Bên PetService phải có handler nhận mảng ids
        // Payload gửi đi: { ids: ['uuid-1', 'uuid-2'] }
        promises.push(
          lastValueFrom(
            this.petcareService.send(
              { cmd: 'getPetsByIds' },
              { ids: appointment.pet_ids },
            ),
          ).catch((err) => {
            console.error(
              '❌ Lỗi lấy thông tin pet từ petcareService:',
              err?.message,
            );
            return []; // Nếu lỗi bên Pet service thì trả về mảng rỗng, không làm chết API
          }),
        );
      } else {
        // Nếu không có pet, tạo một promise giả trả về mảng rỗng để giữ thứ tự index
        promises.push(Promise.resolve([]));
      }

      // 4. Chạy song song các request
      const [clinicResult, allServicesResult, userResult, petsResult] =
        await Promise.all(promises);

      console.log('📋 Clinic Result:', JSON.stringify(clinicResult, null, 2));
      console.log(
        '📋 All Services Result:',
        JSON.stringify(allServicesResult, null, 2),
      );
      console.log('📋 User Result:', JSON.stringify(userResult, null, 2));
      console.log('📋 Pets Result:', JSON.stringify(petsResult, null, 2));

      // 5. Xử lý lọc dữ liệu (Filtering)

      // --- Lọc Service ---
      // appointment.service_ids: ['sv1', 'sv2']
      // allServicesResult: {status: 'success', data: {items: [{id: 'sv1', name: 'A'}, ...], pagination: {...}}}
      let detailServices: any[] = [];
      // Kiểm tra xem kết quả trả về có phải mảng không (đề phòng service trả về lỗi format)
      let servicesList: any[] = [];

      if (Array.isArray(allServicesResult)) {
        servicesList = allServicesResult;
      } else if (Array.isArray(allServicesResult?.data?.items)) {
        servicesList = allServicesResult.data.items;
      } else if (Array.isArray(allServicesResult?.data)) {
        servicesList = allServicesResult.data;
      }

      if (appointment.service_ids && appointment.service_ids.length > 0) {
        detailServices = servicesList.filter((s: any) =>
          appointment.service_ids?.includes(s.id),
        );
      }
      const detailPets = Array.isArray(petsResult)
        ? petsResult
        : petsResult?.data || [];

      // Lấy thông tin user (chỉ lấy tên và số điện thoại)
      const userInfo = userResult?.data || userResult || null;
      const userNameInfo = userInfo
        ? {
          fullname: userInfo.fullname,
          phone_number:
            userInfo.phone?.phone_number || userInfo.phone || null,
        }
        : null;

      return {
        id: appointment.id,
        date: appointment.date,
        shift: appointment.shift,
        status: appointment.status,
        vet_id: appointment.vet_id,
        user_info: userNameInfo,
        clinic_info: clinicResult?.data || clinicResult || null,
        service_infos: detailServices,
        pet_infos: detailPets,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error in getAppointmentById:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy thông tin lịch hẹn',
      });
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    try {
      return await this.appointmentRepositories.findAll(page, limit);
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy danh sách lịch hẹn',
      });
    }
  }

  /**
   * Lấy lịch hẹn theo ID (Basic CRUD)
   */
  async findById(id: string): Promise<any> {
    try {
      const appointment = await this.appointmentRepositories.findById(id);
      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Lịch hẹn với ID ${id} không tồn tại`,
        });
      }
      return appointment;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy lịch hẹn',
      });
    }
  }

  async update(
    id: string,
    data: Partial<any>,
    role?: string | string[],
    userId?: string,
    clinicId?: string,
  ): Promise<any> {
    try {
      const appointment = await this.appointmentRepositories.findById(id);
      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Lịch hẹn với ID ${id} không tồn tại`,
        });
      }

      if (role) {
        if (this.hasRole(role, 'User')) {
          if (!userId) {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Thiếu thông tin người dùng',
            });
          }
          if (appointment.user_id !== userId) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message: 'Bạn không có quyền cập nhật lịch hẹn này',
            });
          }
        } else if (this.hasRole(role, 'Clinic')) {
          // CLINIC: chỉ cập nhật lịch hẹn của phòng khám mình
          if (!clinicId) {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Thiếu thông tin phòng khám',
            });
          }
          if (appointment.clinic_id !== clinicId) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message:
                'Bạn không có quyền cập nhật lịch hẹn của phòng khám khác',
            });
          }
        } else if (!this.isAdminOrStaff(role)) {
          // Các role khác không có quyền
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền cập nhật lịch hẹn',
          });
        }
        // Admin/Staff có thể cập nhật tất cả
      }

      const updated = await this.appointmentRepositories.update(id, data);
      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể cập nhật lịch hẹn',
        });
      }
      return updated;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi cập nhật lịch hẹn',
      });
    }
  }

  async remove(
    id: string,
    role?: string | string[],
    userId?: string,
    clinicId?: string,
  ): Promise<{ message: string }> {
    try {
      const appointment = await this.appointmentRepositories.findById(id);
      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Lịch hẹn với ID ${id} không tồn tại`,
        });
      }

      // Authorization check (nếu có role)
      if (role) {
        if (this.hasRole(role, 'User')) {
          // USER: chỉ xóa lịch hẹn của chính mình
          if (!userId) {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Thiếu thông tin người dùng',
            });
          }
          if (appointment.user_id !== userId) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message: 'Bạn không có quyền xóa lịch hẹn này',
            });
          }
        } else if (this.hasRole(role, 'Clinic')) {
          // CLINIC: chỉ xóa lịch hẹn của phòng khám mình
          if (!clinicId) {
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              message: 'Thiếu thông tin phòng khám',
            });
          }
          if (appointment.clinic_id !== clinicId) {
            throw new RpcException({
              status: HttpStatus.FORBIDDEN,
              message: 'Bạn không có quyền xóa lịch hẹn của phòng khám khác',
            });
          }
        } else if (!this.isAdminOrStaff(role)) {
          // Các role khác không có quyền
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền xóa lịch hẹn',
          });
        }
        // Admin/Staff có thể xóa tất cả
      }

      const result = await this.appointmentRepositories.remove(id);
      if (!result) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể xóa lịch hẹn',
        });
      }
      return { message: 'Lịch hẹn đã được xóa thành công' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi xóa lịch hẹn',
      });
    }
  }
  // ========== END BASIC CRUD FUNCTIONS ==========

  async createAppointmentForCustomer(
    data: CreateAppointmentForCustomerDto,
    partner_id: string,
  ): Promise<any> {
    const {
      clinic_id,
      service_ids,
      pet_ids,
      shift_id,
      date,
      customer_email,
      customer_phone,
    } = data;

    try {
      // Kiểm tra partner có quyền (phải là Clinic, Staff, hoặc Admin)
      let partner;
      try {
        partner = await lastValueFrom(
          this.customerService.send({ cmd: 'getUserById' }, { id: partner_id }),
        );
      } catch (error) {
        console.error('Error getting partner info:', error);
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy thông tin partner: ${error.message || 'Lỗi khi lấy thông tin người dùng'}`,
          'Partner Not Found',
          { partner_id, originalError: error.message },
        );
      }

      if (!partner) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy thông tin partner',
          'Partner Not Found',
          { partner_id },
        );
      }

      const partnerRole = partner.role || [];
      const isPartnerRole =
        this.hasRole(partnerRole, 'Clinic') ||
        this.hasRole(partnerRole, 'Staff') ||
        this.hasRole(partnerRole, 'Admin');

      if (!isPartnerRole) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Chỉ có Clinic, Staff hoặc Admin mới có quyền đặt lịch hộ',
          'Permission Denied',
          {
            partner_id,
            partner_roles: partnerRole,
          },
        );
      }

      // Validate clinic, services, shift
      let clinic, services, shift;
      try {
        [clinic, services, shift] = await Promise.all([
          lastValueFrom(
            this.partnerService.send(
              { cmd: 'getClinicById' },
              { id: clinic_id },
            ),
          ),
          lastValueFrom(
            this.partnerService.send(
              { cmd: 'validateClinicServices' },
              { clinic_id, service_ids },
            ),
          ),
          lastValueFrom(
            this.partnerService.send(
              { cmd: 'getClinicShiftById' },
              { clinic_id, shift_id },
            ),
          ),
        ]);
      } catch (error) {
        console.error('Error validating clinic/services/shift:', error);
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          `Lỗi khi xác thực thông tin: ${error.message || 'Không thể lấy thông tin phòng khám, dịch vụ hoặc ca khám'}`,
          'Validation Error',
          {
            clinic_id,
            service_ids,
            shift_id,
            originalError: error.message,
          },
        );
      }

      const clinicData = clinic?.data || clinic;
      if (!clinicData || clinicData.is_active === false) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Phòng khám không tồn tại hoặc đã ngừng hoạt động',
          'Clinic Not Found',
          { clinic_id, clinic_response: clinic },
        );
      }

      if (!services || services.length !== service_ids.length) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Một hoặc nhiều dịch vụ không tồn tại hoặc không thuộc phòng khám này',
          'Invalid Services',
          {
            clinic_id,
            requested_service_ids: service_ids,
            found_services_count: services?.length || 0,
            services_response: services,
          },
        );
      }

      const shiftData = shift?.data || shift;
      if (!shiftData) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Ca khám không tồn tại hoặc không thuộc phòng khám này',
          'Shift Not Found',
          { clinic_id, shift_id, shift_response: shift },
        );
      }

      let customerUser: any = null;

      try {
        const userByEmail = await lastValueFrom(
          this.customerService.send(
            { cmd: 'getUserByEmailForAuth' },
            { email_address: customer_email },
          ),
        );
        if (userByEmail && userByEmail.id) {
          customerUser = userByEmail;
        }
      } catch (error) {
        try {
          const usersByPhone = await lastValueFrom(
            this.customerService.send(
              { cmd: 'getAllUsers' },
              {
                page: 1,
                limit: 1,
                phone_number: customer_phone,
              },
            ),
          );

          if (
            usersByPhone &&
            usersByPhone.items &&
            usersByPhone.items.length > 0
          ) {
            customerUser = usersByPhone.items[0];
          }
        } catch (phoneError) {
          // User không tồn tại, sẽ tạo appointment với email và phone
          console.log(
            'User không tồn tại, sẽ tạo appointment với thông tin liên hệ',
          );
        }
      }

      const appointmentDate = new Date(date);

      const newAppointmentData: any = {
        clinic_id,
        service_ids,
        pet_ids,
        date: appointmentDate,
        shift: shiftData.shift || shiftData.shift_name,
        partner: partner_id,
        created_by: AppointmentCreatedBy.Partner,
      };

      if (customerUser) {
        // User đã tồn tại: gán customer và user_id
        newAppointmentData.user_id = customerUser.id;
        newAppointmentData.customer = customerUser.id;
        newAppointmentData.status = AppointmentStatus.Confirmed;
      } else {
        // User chưa tồn tại: lưu email và phone, status = Confirmed
        // Tạo một user_id tạm thời hoặc để null (nhưng schema yêu cầu user_id)
        // Tạm thời tạo một UUID tạm hoặc sử dụng một giá trị đặc biệt
        // Tốt nhất là tạo một user_id placeholder hoặc để null nếu có thể
        // Vì schema yêu cầu user_id, ta sẽ tạo một UUID tạm
        const tempUserId = uuid.v4();
        newAppointmentData.user_id = tempUserId; // UUID tạm
        newAppointmentData.customer_email = customer_email;
        newAppointmentData.customer_phone = customer_phone;
        newAppointmentData.status = AppointmentStatus.Confirmed;
      }

      const result =
        await this.appointmentRepositories.create(newAppointmentData);

      // Gửi email xác nhận đặt lịch thành công (cho cả user có tài khoản và chưa có tài khoản)
      try {
        const appointmentDateFormatted = appointmentDate.toLocaleDateString(
          'vi-VN',
          {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          },
        );

        // Xác định email và tên người dùng
        let userEmail: string;
        let userName: string;

        if (customerUser) {
          // User đã có tài khoản
          userEmail = customerUser.email?.email_address || customerUser.email;
          userName =
            customerUser.fullname || customerUser.username || 'Quý khách';
        } else {
          // User chưa có tài khoản, sử dụng email và tên mặc định
          userEmail = customer_email;
          userName = 'Quý khách';
        }

        // Format địa chỉ clinic để phù hợp với email template
        const clinicAddress = clinicData.address
          ? {
            description:
              clinicData.address.detail ||
              clinicData.address.description ||
              '',
            ward: clinicData.address.ward || '',
            district: clinicData.address.district || '',
            city: clinicData.address.city || '',
          }
          : {
            description: '',
            ward: '',
            district: '',
            city: '',
          };

        this.authService.emit(
          { cmd: 'sendAppointmentConfirmation' },
          {
            email: userEmail,
            appointmentDetails: {
              userName: userName,
              appointmentDate: appointmentDateFormatted,
              appointmentTime: `${shiftData.start_time || shiftData.startTime} - ${shiftData.end_time || shiftData.endTime}`,
              clinicName: clinicData.clinic_name || clinicData.name,
              clinicAddress: clinicAddress,
              services: services.map((s) => s.name || s.service_name),
              appointmentId: result.id,
            },
          },
        );
      } catch (emailError) {
        console.error('Không thể gửi email xác nhận:', emailError);
      }

      return result;
    } catch (error) {
      console.error('Error creating appointment for customer:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response,
      });

      if (error.code === 11000) {
        throw createRpcError(
          HttpStatus.CONFLICT,
          'Lịch hẹn bị trùng lặp.',
          'Duplicate Appointment',
          { errorCode: error.code },
        );
      }

      if (error instanceof RpcException) {
        throw error;
      }

      // Báo lỗi chi tiết với thông tin đầy đủ
      throw createRpcError(
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi không xác định khi tạo lịch hẹn hộ khách hàng',
        error.name || 'Internal Server Error',
        {
          originalError: error.message,
          stack:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
          code: error.code,
        },
      );
    }
  }
}
