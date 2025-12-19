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
import { lastValueFrom, timeout } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from 'src/schemas/medical_record.schema';
import { Medication, MedicationDocument } from 'src/schemas/preciption.schema';
import { ClinicRating } from 'src/schemas/rating.schema';
import { RatingRepository } from '../repositories/rating.repositories';
import { CreateClinicRatingDto } from 'src/dto/rating.dto';

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
    private readonly ratingRepository: RatingRepository,
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
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi lấy danh sách lịch hẹn hôm nay cho phòng khám',
        'INTERNAL_SERVER_ERROR'
      );
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
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (!appointment.pet_ids || appointment.pet_ids.length === 0) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể phân công bác sĩ cho lịch hẹn chưa có pet',
          'MISSING_PET_IN_APPOINTMENT'
        );
      }

      // Rule 4: Chỉ cho assign vet khi appointment.status >= CHECKED_IN
      if (
        appointment.status !== AppointmentStatus.Checked_In &&
        appointment.status !== AppointmentStatus.In_Progress
      ) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Chỉ có thể gán bác sĩ cho lịch hẹn đã Check-in',
          'INVALID_APPOINTMENT_STATUS'
        );
      }

      const updated = await this.appointmentRepositories.update(appointmentId, {
        vet_id: vetId,
        status: AppointmentStatus.In_Progress,
      } as Partial<Appointment>);

      if (!updated) {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không thể cập nhật lịch hẹn',
          'APPOINTMENT_UPDATE_FAILED'
        );
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi gán bác sĩ và bắt đầu lịch hẹn',
        'ASSIGN_VET_ERROR'
      );
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
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      // Rule 3: Không cho tạo Medical Record nếu petId == null
      if (!appointment.pet_ids || appointment.pet_ids.length === 0) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Lịch hẹn chưa có pet (pet_id). Không thể tạo hồ sơ bệnh án.',
          'MISSING_PET_IN_APPOINTMENT'
        );
      }

      // Auto-filled from Appointment Check-in Logic
      data.pet_id = appointment.pet_ids[0];

      if (!appointment.pet_ids || !appointment.pet_ids.includes(data.pet_id)) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'pet_id không hợp lệ (không thuộc danh sách đăng ký ban đầu)',
          'INVALID_PET_FOR_APPOINTMENT'
        );
      }

      // Đảm bảo mỗi lịch hẹn chỉ có một hồ sơ bệnh án chính
      const existingRecord = await this.medicalRecordModel
        .findOne({ appointment_id: appointment.id })
        .lean();

      if (existingRecord) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Lịch hẹn này đã có hồ sơ bệnh án',
          'MEDICAL_RECORD_ALREADY_EXISTS'
        );
      }

      const medicalRecord = await this.medicalRecordModel.create({
        appointment_id: appointment.id,
        pet_id: data.pet_id,
        vet_id: appointment.vet_id,
        clinic_id: appointment.clinic_id,
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

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi tạo hồ sơ bệnh án và danh sách thuốc',
        'CREATE_MEDICAL_RECORD_ERROR'
      );
    }
  }

  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (appointment.status !== AppointmentStatus.Pending_Confirmation) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Chỉ có thể xác nhận lịch hẹn ở trạng thái Pending_Confirmation',
          'INVALID_APPOINTMENT_STATUS'
        );
      }

      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Confirmed,
      );

      if (!updated) {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không thể xác nhận lịch hẹn',
          'APPOINTMENT_CONFIRMATION_FAILED'
        );
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi xác nhận lịch hẹn',
        'APPOINTMENT_CONFIRMATION_ERROR'
      );
    }
  }

  async checkInAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (appointment.status !== AppointmentStatus.Confirmed) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Chỉ có thể check-in lịch hẹn ở trạng thái Confirmed',
          'INVALID_APPOINTMENT_STATUS_FOR_CHECKIN'
        );
      }

      // Rule 2: Rule Check-in: Không cho CHECK-IN nếu appointment.petId == null
      if (!appointment.pet_ids || appointment.pet_ids.length === 0) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Lịch hẹn chưa có pet (pet_id). Vui lòng gán pet vào lịch hẹn trước khi check-in',
          'MISSING_PET_FOR_CHECKIN'
        );
      }

      const updated = await this.appointmentRepositories.update(appointmentId, {
        status: AppointmentStatus.Checked_In,
        checked_in_at: new Date(),
      } as Partial<Appointment>);

      if (!updated) {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không thể check-in lịch hẹn',
          'CHECKIN_APPOINTMENT_FAILED'
        );
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi check-in lịch hẹn',
        'CHECKIN_APPOINTMENT_ERROR'
      );
    }
  }

  async completeAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (appointment.status === AppointmentStatus.Cancelled) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể hoàn thành lịch hẹn đã bị hủy',
          'APPOINTMENT_ALREADY_CANCELLED'
        );
      }

      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Completed,
      );

      if (!updated) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Không thể cập nhật trạng thái hoàn thành cho lịch hẹn', 'Internal Server Error');
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi hoàn thành lịch hẹn', 'Internal Server Error');
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
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (clinicId && appointment.clinic_id !== clinicId) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Bạn không có quyền chỉnh sửa lịch hẹn của phòng khám khác',
          'UNAUTHORIZED_CLINIC_ACCESS'
        );
      }

      const pet: any = await lastValueFrom(
        this.petcareService.send({ cmd: 'getPetById' }, { pet_id: petId }),
      );

      if (!pet || (pet as any).error) {
        throw createRpcError(HttpStatus.NOT_FOUND, 'Không tìm thấy pet', 'Not Found');
      }

      const ownerId = (pet as any).owner_id || (pet as any).user_id;
      if (ownerId && appointment.user_id && ownerId !== appointment.user_id) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Pet không thuộc quyền sở hữu của khách đặt lịch', 'Bad Request');
      }

      const currentPetIds = Array.isArray(appointment.pet_ids)
        ? appointment.pet_ids
        : [];
      const newPetIds = Array.from(new Set([...currentPetIds, petId]));

      const updated = await this.appointmentRepositories.update(appointmentId, {
        pet_ids: newPetIds, // Update the single checked-in pet ID
      } as Partial<Appointment>);

      if (!updated) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Không thể gán pet cho lịch hẹn', 'Internal Server Error');
      }

      return updated as any;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi gán pet cho lịch hẹn', 'Internal Server Error');
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
      // - Khi đang có ít nhất một lịch hẹn ACTIVE với pet đó (bất kể khám ở clinic nào)
      if (role && this.hasRole(role, 'Vet')) {
        if (!vetId) {
          return [];
        }

        const activeStatuses = [AppointmentStatus.In_Progress].map(
          (s) => s as unknown as string,
        );

        const hasActiveAppointment =
          await this.appointmentRepositories.existsActiveForPetVet(
            petId,
            vetId,
            activeStatuses,
          );

        if (!hasActiveAppointment) {
          return [];
        }

        // Bác sĩ được assign vào lịch hẹn sẽ xem được toàn bộ lịch sử khám
        // của pet đó (bất kể pet từng khám ở clinic nào).
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

        // Với Vet, chỉ trả về thông tin bệnh và điều trị (ẩn các metadata khác)
        return records.map((r: any) => {
          const limitedRecord = {
            id: r.id,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            // "bệnh"
            diagnosis: r.diagnosis,
            // "điều trị" thể hiện qua ghi chú + đơn thuốc
            notes: r.notes,
            symptoms: r.symptoms,
          };

          return {
            medicalRecord: limitedRecord as any,
            medications: (medsByRecord[r.id] || []) as any,
          };
        });
      }

      // Logic cho Admin, Staff, User
      const isAdmin = role && this.hasRole(role, 'Admin');

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

      return records.map((r: any) => {
        let recordData = r;

        // Nếu không phải Admin, ẩn clinic_id và vet_id
        // Mặc định ẩn nếu role không được cung cấp (an toàn hơn)
        if (!isAdmin) {
          const { clinic_id, vet_id, ...restRecord } = r;
          recordData = {
            ...restRecord,
            // Đảm bảo các trường cần thiết vẫn có
            id: r.id,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            symptoms: r.symptoms,
            diagnosis: r.diagnosis,
            notes: r.notes,
            appointment_id: r.appointment_id,
            pet_id: r.pet_id,
          };
        }

        return {
          medicalRecord: recordData as any,
          medications: (medsByRecord[r.id] || []) as any,
        };
      });
    } catch (error) {
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy hồ sơ bệnh án theo pet', 'Internal Server Error');
    }
  }

  async getAssignedAppointments(
    vetId: string,
    status?: string,
  ): Promise<Appointment[]> {
    try {
      let statuses: string[] = [];

      if (status === 'ALL') {
        // Lấy tất cả, không lọc theo status
        statuses = [];
      } else if (status) {
        // Lấy theo status cụ thể
        statuses = [status];
      } else {
        // Mặc định lấy các lịch hẹn đang active
        statuses = [
          AppointmentStatus.In_Progress,
          AppointmentStatus.Confirmed,
        ].map((s) => s as unknown as string);
      }

      return await this.appointmentRepositories.findByVetAndStatuses(
        vetId,
        statuses,
      );
    } catch (error) {
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy danh sách lịch hẹn được phân công', 'Internal Server Error');
    }
  }

  // =========================================================
  // CLINIC RATING
  // =========================================================

  async createAppointmentRating(
    appointmentId: string,
    userId: string,
    dto: CreateClinicRatingDto,
  ): Promise<ClinicRating> {
    try {
      if (!appointmentId || !userId) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin lịch hẹn hoặc người dùng', 'Bad Request');
      }

      const appointment = await this.appointmentRepositories.findById(
        appointmentId,
      );

      if (!appointment) {
        throw createRpcError(HttpStatus.NOT_FOUND, 'Không tìm thấy lịch hẹn để đánh giá', 'Not Found');
      }

      if (appointment.user_id !== userId) {
        throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền đánh giá lịch hẹn này', 'Forbidden');
      }

      if (appointment.status !== AppointmentStatus.Completed) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Chỉ có thể đánh giá sau khi lịch hẹn đã hoàn thành', 'Bad Request');
      }

      const existed = await this.ratingRepository.findByAppointmentId(
        appointmentId,
      );
      if (existed) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Lịch hẹn này đã được đánh giá trước đó', 'Bad Request');
      }

      // Optionally, we could fetch clinic/service names from partner-service.
      // Để đơn giản, hiện tại chỉ lưu clinic_id, service_ids, stars và notes.
      const rating: Partial<ClinicRating> = {
        appointment_id: appointment.id,
        clinic_id: appointment.clinic_id,
        service_ids: appointment.service_ids,
        user_id: appointment.user_id,
        stars: dto.stars,
        notes: dto.notes,
      };

      return await this.ratingRepository.createRating(rating);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi tạo đánh giá phòng khám', 'Internal Server Error');
    }
  }

  async getClinicRatingSummary(clinicId: string): Promise<{
    clinic_id: string;
    average_stars: number;
    total_ratings: number;
  }> {
    try {
      if (!clinicId) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
      }

      return await this.ratingRepository.getClinicRatingSummary(clinicId);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(error.status || HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy thống kê đánh giá cho phòng khám', 'Internal Server Error');
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
      throw createRpcError(HttpStatus.BAD_REQUEST, 'Bạn chỉ có thể đặt lịch hẹn trong ngày hiện tại hoặc tương lai', 'Bad Request');
    }

    const hasServices = Array.isArray(service_ids) && service_ids.length > 0;

    try {
      const clinic = await lastValueFrom(
        this.partnerService
          .send({ cmd: 'getClinicById' }, { id: clinic_id })
          .pipe(timeout(5000)),
      ).catch((err) => {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Lỗi khi lấy thông tin phòng khám (Timeout/Error)', 'Bad Request');
      });

      let services: any[] = [];
      if (hasServices) {
        services = await lastValueFrom(
          this.partnerService
            .send({ cmd: 'validateClinicServices' }, { clinic_id, service_ids })
            .pipe(timeout(5000)),
        ).catch((err) => {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Lỗi khi xác thực dịch vụ hoặc dịch vụ không thuộc phòng khám này', 'Bad Request');
        });
        console.log(
          '>>> [createAppointment] services:',
          JSON.stringify(services),
        );
      }

      const shift = await lastValueFrom(
        this.partnerService
          .send({ cmd: 'getClinicShiftById' }, { clinic_id, shift_id })
          .pipe(timeout(5000)),
      ).catch((err) => {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
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

      if (pet_ids && pet_ids.length > 0) {
        console.log('>>> [createAppointment] Validating pets ownership...');
        for (const petId of pet_ids) {
          const pet = await lastValueFrom(
            this.petcareService
              .send({ cmd: 'getPetById' }, { pet_id: petId })
              .pipe(timeout(5000)),
          ).catch((err) => {
            throw createRpcError(HttpStatus.BAD_REQUEST, `Lỗi khi lấy thông tin thú cưng (ID: ${petId})`, 'Bad Request');
          });

          if (!pet) {
            throw createRpcError(HttpStatus.NOT_FOUND, `Thú cưng với ID ${petId} không tồn tại`, 'Not Found');
          }

          if (pet.owner.user_id !== user_id) {
            throw createRpcError(HttpStatus.FORBIDDEN, `Thú cưng (ID: ${petId}) không thuộc về người dùng này`, 'Forbidden');
          }
        }
        console.log('>>> [createAppointment] All pets validated.');
      }

      const bookingGroupId = uuid.v4();
      const appointmentsToCreate: any[] = [];

      const petIdsToProcess = pet_ids && pet_ids.length > 0 ? pet_ids : [];

      if (petIdsToProcess.length === 0) {
        const newAppointmentData: any = {
          ...data,
          id: uuid.v4(),
          user_id,
          date: appointmentDate,
          shift: shift.data.shift,
          status: AppointmentStatus.Pending_Confirmation,
          service_ids: hasServices ? service_ids : [],
          pet_ids: [],
          booking_group_id: bookingGroupId,
        };
        if (isUserRole) {
          newAppointmentData.created_by = AppointmentCreatedBy.Customer;
        } else if (isPartnerRole) {
          newAppointmentData.created_by = AppointmentCreatedBy.Partner;
        }
        appointmentsToCreate.push(newAppointmentData);
      } else {
        for (const petId of petIdsToProcess) {
          const newAppointmentData: any = {
            ...data,
            id: uuid.v4(),
            user_id,
            date: appointmentDate,
            shift: shift.data.shift,
            status: AppointmentStatus.Pending_Confirmation,
            service_ids: hasServices ? service_ids : [],
            pet_ids: [petId],
            booking_group_id: bookingGroupId,
          };

          if (isUserRole) {
            newAppointmentData.created_by = AppointmentCreatedBy.Customer;
          } else if (isPartnerRole) {
            newAppointmentData.created_by = AppointmentCreatedBy.Partner;
          }


          appointmentsToCreate.push(newAppointmentData);
        }
      }

      console.log(
        'appointmentsToCreate:',
        JSON.stringify(appointmentsToCreate),
      );

      const result =
        await this.appointmentRepositories.insertMany(appointmentsToCreate);
      console.log('Created appointments count:', result.length);

      const appointmentDateFormatted = appointmentDate.toLocaleDateString(
        'vi-VN',
        { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' },
      );

      console.log('Created appointments count:', result.length);

      return result;
    } catch (error) {
      if (error.code === 11000) {
        throw createRpcError(HttpStatus.CONFLICT, 'Lịch hẹn của bạn bị trùng lặp.', 'Conflict');
      }
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error creating appointment:', error);
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi không xác định khi tạo lịch hẹn', 'Internal Server Error');
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

      // Chuyển đổi role thành mảng nếu là chuỗi
      const roles = Array.isArray(role) ? role : [role];

      // Kiểm tra quyền
      const isAdminOrStaff = roles.some((r) => ['Admin', 'Staff'].includes(r));
      const isClinic = roles.includes('Clinic');
      const isUser = roles.includes('User');

      if (isUser) {
        // USER: chỉ xem appointments của chính mình
        if (!userId) {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin người dùng', 'Bad Request');
        }
        result = await this.appointmentRepositories.findByUserId(
          userId,
          page,
          limit,
        );
      } else if (isClinic) {
        // CLINIC: chỉ xem appointments của phòng khám mình
        if (!clinicId) {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
        }
        result = await this.appointmentRepositories.findByClinicId(
          clinicId,
          page,
          limit,
        );
      } else if (isAdminOrStaff) {
        // ADMIN/STAFF: xem tất cả appointments
        result = await this.appointmentRepositories.findAll(page, limit);
      } else {
        throw createRpcError(HttpStatus.FORBIDDEN, 'Không có quyền truy cập', 'Forbidden');
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

      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy danh sách lịch hẹn', 'Internal Server Error');
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
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy danh sách lịch hẹn của bác sĩ thú y', 'Internal Server Error');
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
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      // Authorization check (nếu có role)
      if (role) {
        if (this.hasRole(role, 'User')) {
          // USER: chỉ cập nhật status của appointment của chính mình
          if (!updatedByUserId) {
            throw createRpcError(
              HttpStatus.BAD_REQUEST,
              'Thiếu thông tin người dùng',
              'MISSING_USER_ID'
            );
          }
          if (appointment.user_id !== updatedByUserId) {
            throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật trạng thái lịch hẹn này', 'Forbidden');
          }
        } else if (this.hasRole(role, 'Clinic')) {
          // CLINIC: chỉ cập nhật status của appointment của phòng khám mình
          if (!clinicId) {
            throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
          }
          if (appointment.clinic_id !== clinicId) {
            throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật trạng thái lịch hẹn của phòng khám khác', 'Forbidden');
          }
        } else if (!this.isAdminOrStaff(role)) {
          // Các role khác không có quyền
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật trạng thái lịch hẹn', 'Forbidden');
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
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Không thể cập nhật trạng thái lịch hẹn', 'Internal Server Error');
      }

      return updated;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi cập nhật trạng thái lịch hẹn', 'Internal Server Error');
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
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      // Phân quyền: kiểm tra ai có quyền hủy
      if (this.hasRole(role, 'User')) {
        // USER: chỉ hủy được appointment của chính mình
        if (appointment.user_id !== cancelledByUserId) {
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền hủy lịch hẹn này', 'Forbidden');
        }
      } else if (this.hasRole(role, 'Clinic')) {
        // CLINIC: chỉ hủy được appointment của phòng khám mình
        if (!clinicId) {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
        }
        if (appointment.clinic_id !== clinicId) {
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền hủy lịch hẹn này', 'Forbidden');
        }
      } else if (!this.isAdminOrStaff(role)) {
        // ADMIN/STAFF: hủy được tất cả, các role khác không có quyền
        throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền hủy lịch hẹn', 'Forbidden');
      }

      // Kiểm tra appointment chưa bị hủy hoặc đã hoàn thành
      if (appointment.status === AppointmentStatus.Cancelled) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Lịch hẹn này đã bị hủy trước đó', 'Bad Request');
      }

      if (appointment.status === AppointmentStatus.Completed) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Không thể hủy lịch hẹn đã hoàn thành', 'Bad Request');
      }

      const cancelReason = cancelData?.cancel_reason;

      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Cancelled,
        cancelReason, // Có thể là string, empty string, hoặc undefined
        cancelledByUserId,
      );

      if (!updated) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Không thể hủy lịch hẹn', 'Internal Server Error');
      }

      return updated;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi hủy lịch hẹn', 'Internal Server Error');
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
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      // 2. Kiểm tra quyền (Check Authorization)
      // 2. Kiểm tra quyền (Check Authorization)
      let isAuthorized = false;

      // 2a. Admin & Staff luôn có quyền
      if (this.isAdminOrStaff(role)) {
        isAuthorized = true;
      }

      // 2b. Check quyền Clinic
      if (!isAuthorized && this.hasRole(role, 'Clinic')) {
        if (!clinicId) {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
        }
        if (appointment.clinic_id === clinicId) {
          isAuthorized = true;
        }
      }

      // 2c. Check quyền Vet (Chỉ bác sĩ được gán mới xem được)
      if (!isAuthorized && this.hasRole(role, 'Vet')) {
        if (!userId) {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin người dùng', 'Bad Request');
        }
        if (appointment.vet_id === userId) {
          isAuthorized = true;
        }
      }

      // 2d. Check quyền User (Chủ sở hữu lịch hẹn)
      if (!isAuthorized && this.hasRole(role, 'User')) {
        if (!userId) {
          throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin người dùng', 'Bad Request');
        }
        const appointmentCustomer =
          (appointment as any).customer ??
          (appointment as any).customer_id ??
          (appointment as any).customerId;

        if (appointment.user_id === userId || appointmentCustomer === userId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền xem lịch hẹn này', 'Forbidden');
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
      // [2] Xử lý Pet: Kiểm tra xem có pet_ids không rồi mới gọi
      const hasPets = appointment.pet_ids && appointment.pet_ids.length > 0;
      console.log('>>> [getAppointmentById] hasPets:', hasPets, 'pet_ids:', appointment.pet_ids);

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

      let detailPets: any[] = [];
      if (Array.isArray(petsResult)) {
        detailPets = petsResult;
      } else if (petsResult && Array.isArray(petsResult.data)) {
        detailPets = petsResult.data;
      } else if (petsResult && Array.isArray(petsResult.items)) {
        detailPets = petsResult.items;
      }

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
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy thông tin lịch hẹn', 'Internal Server Error');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    try {
      return await this.appointmentRepositories.findAll(page, limit);
    } catch (error) {
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy danh sách lịch hẹn', 'Internal Server Error');
    }
  }

  /**
   * Lấy lịch hẹn theo ID (Basic CRUD)
   */
  async findById(id: string): Promise<any> {
    try {
      const appointment = await this.appointmentRepositories.findById(id);
      if (!appointment) {
        throw createRpcError(HttpStatus.NOT_FOUND, `Lịch hẹn với ID ${id} không tồn tại`, 'Not Found');
      }
      return appointment;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi lấy lịch hẹn', 'Internal Server Error');
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
        throw createRpcError(HttpStatus.NOT_FOUND, `Lịch hẹn với ID ${id} không tồn tại`, 'Not Found');
      }

      if (role) {
        if (this.hasRole(role, 'User')) {
          if (!userId) {
            throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin người dùng', 'Bad Request');
          }
          if (appointment.user_id !== userId) {
            throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật lịch hẹn này', 'Forbidden');
          }
        } else if (this.hasRole(role, 'Clinic')) {
          // CLINIC: chỉ cập nhật lịch hẹn của phòng khám mình
          if (!clinicId) {
            throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
          }
          if (appointment.clinic_id !== clinicId) {
            throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật lịch hẹn của phòng khám khác', 'Forbidden');
          }
        } else if (!this.isAdminOrStaff(role)) {
          // Các role khác không có quyền
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật lịch hẹn', 'Forbidden');
        }
        // Admin/Staff có thể cập nhật tất cả
      }

      const updated = await this.appointmentRepositories.update(id, data);
      if (!updated) {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không thể cập nhật lịch hẹn',
          'APPOINTMENT_UPDATE_FAILED'
        );
      }
      return updated;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi cập nhật lịch hẹn', 'Internal Server Error');
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
        throw createRpcError(HttpStatus.NOT_FOUND, `Lịch hẹn với ID ${id} không tồn tại`, 'Not Found');
      }

      // Authorization check (nếu có role)
      if (role) {
        if (this.hasRole(role, 'User')) {
          // USER: chỉ xóa lịch hẹn của chính mình
          if (!userId) {
            throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin người dùng', 'Bad Request');
          }
          if (appointment.user_id !== userId) {
            throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền xóa lịch hẹn này', 'Forbidden');
          }
        } else if (this.hasRole(role, 'Clinic')) {
          // CLINIC: chỉ xóa lịch hẹn của phòng khám mình
          if (!clinicId) {
            throw createRpcError(HttpStatus.BAD_REQUEST, 'Thiếu thông tin phòng khám', 'Bad Request');
          }
          if (appointment.clinic_id !== clinicId) {
            throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền xóa lịch hẹn của phòng khám khác', 'Forbidden');
          }
        } else if (!this.isAdminOrStaff(role)) {
          // Các role khác không có quyền
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền xóa lịch hẹn', 'Forbidden');
        }
        // Admin/Staff có thể xóa tất cả
      }

      const result = await this.appointmentRepositories.remove(id);
      if (!result) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Không thể xóa lịch hẹn', 'Internal Server Error');
      }
      return { message: 'Lịch hẹn đã được xóa thành công' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, error.message || 'Lỗi khi xóa lịch hẹn', 'Internal Server Error');
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

  async getMedicalRecordByAppointment(
    appointmentId: string,
    userId: string,
    role: string | string[],
  ): Promise<any> {
    try {
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      const isVet = this.hasRole(role, 'Vet');
      const isClinic = this.hasRole(role, 'Clinic');
      const isUser = this.hasRole(role, 'User');

      let canView = false;

      // Clinic staff can view records when status is Checked_In or In_Progress
      if (isClinic) {
        if ([AppointmentStatus.Checked_In, AppointmentStatus.In_Progress].includes(appointment.status)) {
          canView = true;
        }
      }
      // Vets can only view records when status is In_Progress
      else if (isVet && appointment.status === AppointmentStatus.In_Progress) {
        canView = true;
      }
      // Users can view their own records when status is not Completed
      else if (isUser && appointment.user_id === userId &&
        appointment.status !== AppointmentStatus.Completed) {
        canView = true;
      }

      if (!canView) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Bạn không có quyền xem hồ sơ bệnh án ở trạng thái này',
          'UNAUTHORIZED_MEDICAL_RECORD_ACCESS'
        );
      }

      const record = await this.medicalRecordModel
        .findOne({ appointment_id: appointmentId })
        .lean();

      if (!record) {
        return null;
      }

      return {
        symptoms: record.symptoms,
        diagnosis: record.diagnosis,
        notes: record.notes,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi lấy hồ sơ bệnh án',
        'GET_MEDICAL_RECORD_ERROR'
      );
    }
  }

  async updateMedicalRecord(
    appointmentId: string,
    userId: string,
    role: string | string[],
    updateData: any,
  ): Promise<any> {
    try {
      if (!this.hasRole(role, 'Vet')) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Chỉ bác sĩ thú y mới được cập nhật hồ sơ bệnh án',
          'UNAUTHORIZED_MEDICAL_RECORD_UPDATE'
        );
      }

      const appointment = await this.appointmentRepositories.findById(appointmentId);

      if (!appointment) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy lịch hẹn',
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (appointment.status !== AppointmentStatus.In_Progress) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Chỉ được cập nhật hồ sơ khi lịch hẹn đang diễn ra (In_Progress)',
          'INVALID_APPOINTMENT_STATUS_FOR_UPDATE'
        );
      }

      const allowedUpdates = {
        symptoms: updateData.symptoms,
        diagnosis: updateData.diagnosis,
        notes: updateData.notes,
        updated_by: userId,
        updated_at: new Date(),
      };

      // Filter out undefined values
      Object.keys(allowedUpdates).forEach(
        (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
      );

      if (Object.keys(allowedUpdates).length === 0) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không có dữ liệu hợp lệ để cập nhật',
          'NO_VALID_UPDATE_DATA'
        );
      }

      const updatedRecord = await this.medicalRecordModel.findOneAndUpdate(
        { appointment_id: appointmentId },
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      );

      if (!updatedRecord) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy hồ sơ bệnh án để cập nhật',
          'MEDICAL_RECORD_NOT_FOUND'
        );
      }

      return {
        status: 'success',
        message: 'Cập nhật hồ sơ bệnh án thành công',
        data: updatedRecord
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi khi cập nhật hồ sơ bệnh án',
        'UPDATE_MEDICAL_RECORD_ERROR'
      );
    }
  }
}
