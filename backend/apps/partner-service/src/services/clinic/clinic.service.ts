import { RpcException } from '@nestjs/microservices';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CreateClinicFormDto } from 'src/dto/clinic/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/clinic/create-clinic.dto';
import { CreateServiceDto } from 'src/dto/clinic/services/create-service.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/clinic/update-status.dto';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { ServiceRepository } from 'src/repositories/clinic/service.repositories';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';
import { UpdateClinicFormDto } from 'src/dto/clinic/clinic/update-clinic-form.dto';
import { generateRandomPassword } from 'src/common/generate.common';
import { v4 as uuidv4 } from 'uuid';
import { ShiftRepository } from 'src/repositories/clinic/shift.repositories';
import { createRpcError } from 'src/common/error.detail';
import { VetRepository } from 'src/repositories/vet/vet.repositories';

@Injectable()
export class ClinicService {
  constructor(
    private readonly clinicRepositories: ClinicsRepository,
    private readonly serviceRepositories: ServiceRepository,
    private readonly shiftRepositories: ShiftRepository,
    private readonly vetRepositories: VetRepository,
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) { }


  async findAllClinicForm(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<any> {
    try {
      page = Number(page);
      limit = Number(limit);
      const skip = (page - 1) * limit;

      const filters = { status, skip, limit };

      const { data, total } = await this.clinicRepositories.findAll(filters);

      return {
        status: 'success',
        message: 'Lấy danh sách form đăng ký phòng khám thành công',
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        data,
      };
    } catch (err) {
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        err.message || 'Lỗi khi lấy danh sách form đăng ký clinic',
        'Internal Server Error',
      );
    }
  }

  async createClinicForm(
    createClinicFormData: CreateClinicFormDto,
  ): Promise<any> {
    try {
      // Validate uniqueness constraints prior to creating the form
      const { email, phone, license_number, representative } =
        createClinicFormData as any;

      // Ensure provided fields do not duplicate existing clinic forms
      const [emailTaken, phoneTaken, licenseTaken] = await Promise.all([
        this.clinicRepositories.existsClinicFormByEmail(email?.email_address),
        this.clinicRepositories.existsClinicFormByPhone(phone?.phone_number),
        this.clinicRepositories.existsClinicFormByLicenseNumber(license_number),
      ]);

      if (emailTaken) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Email đã tồn tại trong đơn đăng ký khác',
          'Bad Request',
        );
      }

      if (phoneTaken) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Số điện thoại đã tồn tại trong đơn đăng ký khác',
          'Bad Request',
        );
      }

      if (licenseTaken) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Số giấy phép phòng khám đã tồn tại',
          'Bad Request',
        );
      }

      // Validate representative responsible licenses do not conflict with existing forms
      if (representative?.responsible_licenses?.length) {
        const respLicenses: string[] = representative.responsible_licenses;
        const checks = await Promise.all(
          respLicenses.map((lic) =>
            this.clinicRepositories.existsClinicFormByResponsibleLicense(lic),
          ),
        );

        const anyTaken = checks.some((v) => v);
        if (anyTaken) {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Một hoặc nhiều giấy phép hành nghề của người đại diện đã được sử dụng ở đơn khác',
            'Bad Request',
          );
        }
      }

      const result = await this.clinicRepositories
        .createClinicForm(createClinicFormData)
        .catch((error) => {
          console.error('Error creating clinic form:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tạo form đăng ký phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể tạo form đăng ký phòng khám',
          'Bad Request',
        );
      }

      return {
        status: 'success',
        message: 'Tạo form đăng ký phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi tạo form đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async findClinicFormById(idForm: string): Promise<any> {
    try {
      const result = await this.clinicRepositories
        .findOneClinicForm(idForm)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tìm kiếm form đăng ký phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy form đăng ký phòng khám với ID: ${idForm}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin form đăng ký phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy thông tin form đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateStatusClincForm(
    updateStatus: UpdateStatusClinicDto,
  ): Promise<any> {
    try {
      const clinicForm = await this.clinicRepositories
        .findOneClinicForm(updateStatus.id)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tìm kiếm form đăng ký phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!clinicForm) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy form đăng ký phòng khám',
          'Not Found',
        );
      }
      console.log('Clinic Form12312312:', clinicForm);
      const result = await this.clinicRepositories
        .updateStatusClinicForm(updateStatus)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật trạng thái đơn đăng ký',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể cập nhật trạng thái đơn đăng ký phòng khám',
          'Bad Request',
        );
      }
      if (updateStatus.status === RegisterStatus.APPROVED) {
        try {
          const createDto: CreateClinicDto = {
            id: clinicForm.id,
            clinic_name: clinicForm.clinic_name,
            email: clinicForm.email,
            phone: clinicForm.phone,
            license_number: clinicForm.license_number,
            address: clinicForm.address,
            description: clinicForm.description,
            logo_url: clinicForm.logo_url,
            website: clinicForm.website,
            representative: clinicForm.representative,
          };
          console.log('ljkasldjasd', createDto);
          const createdClinic = await this.clinicRepositories
            .createClinic(createDto)
            .catch((error) => {
              throw createRpcError(
                HttpStatus.BAD_REQUEST,
                'Lỗi khi tạo phòng khám',
                'Bad Request',
                error.message,
              );
            });
          console.log('createdClinic', createdClinic);
          if (!createdClinic) {
            throw createRpcError(
              HttpStatus.BAD_REQUEST,
              'Không thể tạo phòng khám',
              'Bad Request',
            );
          }
          // Tạo user account với vai trò "Clinic"
          const userAccountData = {
            id: uuidv4(),
            email: clinicForm.email,
            phone: clinicForm.phone,
            clinic_id: createdClinic.id,
            fullname: clinicForm.clinic_name,
            username: clinicForm.email.email_address,
            password: generateRandomPassword(),
            role: ['Clinic'],
            is_active: true,
          };

          try {
            const recipientEmail =
              typeof clinicForm.representative.email === 'object'
                ? clinicForm.representative.email.email_address
                : clinicForm.representative.email;

            console.log('Sending welcome email to:', recipientEmail);

            await lastValueFrom(
              this.authService.send(
                { cmd: 'sendClinicWelcomeEmail' },
                {
                  email: recipientEmail,
                  clinicName: clinicForm.clinic_name,
                  representativeName: clinicForm.representative_name,
                  username: userAccountData.username,
                  password: userAccountData.password,
                },
              ),
            );

            console.log('Welcome email sent successfully');
          } catch (error) {
            console.error('Error sending welcome email:', {
              message: error?.message || error?.toString() || 'Unknown error',
              stack: error?.stack,
              error: error,
            });
          }
          console.log('ljkalskdjalsd', userAccountData);
          const newUser = await lastValueFrom(
            this.customerService.send({ cmd: 'createUser' }, userAccountData),
          ).catch((error) => {
            console.error('Error creating user account for clinic:', error);
            throw createRpcError(
              HttpStatus.INTERNAL_SERVER_ERROR,
              'Lỗi khi tạo tài khoản người dùng cho phòng khám',
              'Internal Server Error',
              error.message,
            );
          });
          if (!newUser) {
            throw createRpcError(
              HttpStatus.INTERNAL_SERVER_ERROR,
              'Không thể tạo tài khoản người dùng cho phòng khám',
              'Internal Server Error',
            );
          }

          //  Sau khi tạo tài khoản clinic xong thì cần update lại để mapping clinic đến bảng user
          const update_clinic = await this.clinicRepositories.updateClinic(
            clinicForm.id,
            { user_account_id: userAccountData.id },
          );
          if (!update_clinic) {
            throw createRpcError(
              HttpStatus.INTERNAL_SERVER_ERROR,
              'chỉnh sửa thông tin user_account_id thất bại',
              'Internal Server Error',
            );
          }

          // Kiểm tra và set is_active dựa trên service và shift
          // Clinic mới tạo chưa có service và shift nên sẽ là is_active = false
          // Nếu sau này có cả service và shift thì sẽ tự động chuyển thành is_active = true
          await this.triggerToCheckActiveClinic(createdClinic.id).catch(
            (error) => {
              console.error(
                'Error checking active status for new clinic:',
                error,
              );
              // Không throw error vì đây chỉ là logic check, không ảnh hưởng đến việc tạo clinic
            },
          );

          return {
            status: 'success',
            message: 'Duyệt đơn thành công và đã tạo phòng khám',
            data: { register: result, clinic: createdClinic },
          };
        } catch (error) {
          await this.clinicRepositories
            .rollbackStatusToPending(result.id)
            .catch((rollbackError) => {
              console.error('Error rolling back status:', rollbackError);
            });

          throw createRpcError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            `Tạo phòng khám thất bại, trạng thái đã được khôi phục: ${error.message}`,
            'Internal Server Error',
            error.message,
          );
        }
      }
      return {
        status: 'success',
        message: `Cập nhật trạng thái thành công: ${updateStatus.status}`,
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái đơn đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateClinicActiveStatus(
    id: string,
    is_active: boolean,
  ): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID phòng khám không được để trống',
          'Bad Request',
        );
      }

      const updatedClinic = await this.clinicRepositories
        .updateActiveStatus(id, is_active)
        .catch((error) => {
          console.error('Error updating clinic active status:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật trạng thái hoạt động của phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!updatedClinic) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy phòng khám với ID: ${id}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: `Cập nhật trạng thái hoạt động của phòng khám ${id} thành công`,
        data: updatedClinic,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái hoạt động của phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async findAllClinic(
    page = 1,
    limit = 10,
    isAdminOrStaff: boolean = false,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      // Admin hoặc Staff có thể xem tất cả (active + deactive)
      // Các role khác (User, v.v.) chỉ xem clinic đã active
      const canViewAll = !!isAdminOrStaff;

      // Nếu không phải admin/staff, chỉ lấy active clinics
      const onlyActive = !canViewAll;

      const [data, total] = await Promise.all([
        this.clinicRepositories
          .findAllClinic(skip, limit, onlyActive)
          .catch((error) => {
            console.error('Error finding all clinics:', error);
            throw createRpcError(
              HttpStatus.BAD_REQUEST,
              'Lỗi khi tìm kiếm danh sách phòng khám',
              'Bad Request',
              error.message,
            );
          }),
        this.clinicRepositories
          .countAllClinic(onlyActive)
          .catch((error) => {
            throw createRpcError(
              HttpStatus.BAD_REQUEST,
              'Lỗi khi đếm số lượng phòng khám',
              'Bad Request',
              error.message,
            );
          }),
      ]);

      // Filter sensitive information for non-admin users
      const filteredData = data.map((clinic) => {
        if (canViewAll) {
          return clinic; // Return all data for admin/staff users
        }

        // User thường chỉ nhận thông tin cơ bản
        return {
          id: clinic.id,
          clinic_name: clinic.clinic_name,
          address: clinic.address,
          phone: clinic.phone,
          email: clinic.email,
          description: clinic.description,
          logo_url: clinic.logo_url,
          website: clinic.website,
          is_active: clinic.is_active,
        };
      });

      return {
        status: 'success',
        message: 'Lấy danh sách phòng khám thành công',
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        data: filteredData,
      };
    } catch (err) {
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        err.message || 'Lỗi khi lấy danh sách phòng khám',
        'Internal Server Error',
      );
    }
  }

  async createService(data: CreateServiceDto, clinic_id: string): Promise<any> {
    try {
      const user = await lastValueFrom(
        this.customerService.send({ cmd: 'getUserById' }, { id: clinic_id }),
      ).catch((error) => {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không lấy được thông tin người dùng',
          'Internal Server Error',
          error.message,
        );
      });
      if (!user) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy người dùng',
          'NOT_FOUND',
        );
      }
      const clinic = await this.clinicRepositories.getClinicByEmail(
        user.email.email_address,
      );
      const result = await this.serviceRepositories.createService(
        data,
        clinic.id,
      );

      if (!result) {
        throw new BadRequestException('Không thể tạo mới dịch vụ');
      }

      return {
        success: true,
        message: 'Tạo dịch vụ thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        err.message || 'Lỗi không xác định khi tạo dịch vụ',
        'Internal Server Error',
      );
    }
  }

  async getAllService(
    page: number = 1,
    limit: number = 10,
    clinic_id: string,
  ): Promise<any> {
    try {
      const result = await this.serviceRepositories
        .getAllService(page, limit)
        .catch((error) => {
          console.error('Error getting all services:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi lấy danh sách dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      return {
        status: 'success',
        message: 'Lấy danh sách dịch vụ thành công',
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        data: result.data,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in getAllService:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy danh sách dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateService(
    serviceId: string,
    updateServiceDto: any,
    clinic_id: string,
  ): Promise<any> {
    try {
      if (!serviceId) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID dịch vụ không được để trống',
          'Bad Request',
        );
      }

      if (!updateServiceDto) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Dữ liệu cập nhật không được để trống',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories
        .updateService(serviceId, updateServiceDto, clinic_id)
        .catch((error) => {
          console.error('Error updating service:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ để cập nhật',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Cập nhật dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in updateService:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      if (!serviceId) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID dịch vụ không được để trống',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories
        .removeService(serviceId, clinic_id)
        .catch((error) => {
          console.error('Error removing service:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi xóa dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result || result.deletedCount === 0) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ để xóa',
          'Not Found',
        );
      }
      await this.triggerToCheckActiveClinic(clinic_id);
      return {
        status: 'success',
        message: 'Xóa dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in removeService:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi xóa dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateServiceStatus(id: string, is_active: boolean): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          400,
          'ID dịch vụ không được để trống',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories
        .updateServiceStatus(id, is_active)
        .catch((error) => {
          console.error('Error updating service status:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật trạng thái dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ cần cập nhật trạng thái',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: `Cập nhật trạng thái dịch vụ thành công (${is_active ? 'Kích hoạt' : 'Vô hiệu hóa'})`,
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in updateServiceStatus:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async getClinicById(id: string): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID phòng khám không được để trống',
          'Bad Request',
        );
      }

      const result = await this.clinicRepositories
        .getClinicById(id)
        .catch((error) => {
          console.error('Error getting clinic by ID:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi lấy thông tin phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy phòng khám với ID: ${id}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in getClinicById:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy thông tin phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateClinicFormByMail(updateData: any): Promise<any> {
    try {
      const result =
        await this.clinicRepositories.updateClinicFormByMail(updateData);

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không thể cập nhật form đăng ký phòng khám',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Cập nhật form đăng ký phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật form đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async getClinicByVerificationToken(token: string): Promise<any> {
    try {
      const clinic =
        await this.clinicRepositories.findByVerificationToken(token);

      if (!clinic) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy phòng khám với token xác minh này.',
          'Not Found',
        );
      }

      return clinic;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi khi tìm phòng khám theo token xác minh.',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async updateClinicForm(id: string, dto: UpdateClinicFormDto): Promise<any> {
    const clinic = await this.clinicRepositories.findOneClinicForm(id);

    if (!clinic) {
      throw createRpcError(
        HttpStatus.NOT_FOUND,
        'Phòng khám không tồn tại',
        'Not Found',
      );
    }
    console.log('updateClinicForm clinic123123123:', dto);
    const updatedClinic = await this.clinicRepositories.updateClinicForm(
      id,
      dto,
    );

    return updatedClinic;
  }

  async getClinicMembers(clinic_id: string): Promise<any> {
    const clinic = await this.clinicRepositories.getClinicById(clinic_id);

    if (!clinic) {
      throw createRpcError(
        HttpStatus.NOT_FOUND,
        'Phòng khám không tồn tại',
        'Not Found',
      );
    }

    // Lấy thông tin chi tiết của từng member bao gồm role
    const memberDetails = await Promise.all(
      clinic.member_ids.map(async (member_id) => {
        const vet = await this.vetRepositories.findVetById(member_id);
        if (!vet) return null;

        // Tìm role của member trong clinic này
        const memberRole = vet.clinic_roles?.find(
          (cr: any) => cr.clinic_id === clinic_id,
        );

        // Lấy thông tin người dùng từ customer-service (email, phone, fullname, is_active)
        let userInfo: any = null;
        try {
          const userResult = await lastValueFrom(
            this.customerService.send(
              { cmd: 'getUserById' },
              { id: vet.id, role: ['Staff'] }, // request with elevated role to include is_active
            ),
          );
          userInfo = userResult;
        } catch (err) {
          // Nếu lỗi, log và tiếp tục với thông tin vet cơ bản
          console.warn('Không lấy được user info cho member', member_id, err?.message || err);
        }

        return {
          member_id: vet.id,
          role: memberRole?.role || 'unknown',
          joined_at: memberRole?.joined_at || null,
          specialty: vet.specialty,
          exp: vet.exp,
          fullname: userInfo?.fullname || null,
          email: userInfo?.email?.email_address || null,
          phone: userInfo?.phone?.phone_number || null,
          is_active: typeof userInfo?.is_active === 'boolean' ? userInfo.is_active : null,
        };
      }),
    );

    return {
      status: 'success',
      message: 'Lấy danh sách thành viên phòng khám thành công',
      data: {
        clinic_id: clinic.id,
        clinic_name: clinic.clinic_name,
        members: memberDetails.filter((m) => m !== null),
        total_members: clinic.member_ids?.length || 0,
      },
    };
  }

  async triggerToCheckActiveClinic(clinic_id: string): Promise<void> {
    try {
      const serviceCount =
        await this.serviceRepositories.countServicesByClinicId(clinic_id);
      console.log('klajhsdkhasd', serviceCount);
      const shiftCount =
        await this.shiftRepositories.countShiftByClinicId(clinic_id);
      console.log('i9813eih1ej', shiftCount);
      const clinic = await this.clinicRepositories.getClinicById(clinic_id);

      if (!clinic) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy phòng khám!',
          'Not Found',
        );
      }

      if (serviceCount > 0 && shiftCount > 0) {
        if (clinic.is_active === false) {
          await this.clinicRepositories.updateClinic(clinic_id, {
            is_active: true,
          });
        }
      } else {
        console.log('đã chạy vào đây ');
        if (clinic.is_active === true) {
          const update = await this.clinicRepositories.updateClinic(clinic_id, {
            is_active: false,
          });
          console.log('ljalsdja12e0', update);
        }
      }
    } catch (err) {
      if (err.status === HttpStatus.NOT_FOUND) {
        throw err;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        err.message || 'Lỗi khi kiểm tra phòng khám đã active hay chưa',
        'Internal Server Error',
      );
    }
  }
  async removeMember(clinicId: string, memberId: string): Promise<any> {
    try {
      if (!clinicId || !memberId) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thiếu thông tin phòng khám hoặc thành viên',
          'Bad Request',
        );
      }

      // 1. Check if clinic exists
      const clinic = await this.clinicRepositories.getClinicById(clinicId);
      if (!clinic) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy phòng khám',
          'Not Found',
        );
      }

      // 2. Check if member is in clinic
      if (!clinic.member_ids || !clinic.member_ids.includes(memberId)) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thành viên không thuộc phòng khám này',
          'Bad Request',
        );
      }

      // 3. Remove member from clinic
      await this.clinicRepositories.removeMemberFromClinic(clinicId, memberId);

      // 4. Remove clinic from vet
      await this.vetRepositories.removeClinicFromVet(memberId, clinicId);

      return {
        status: 'success',
        message: 'Đã xóa thành viên khỏi phòng khám thành công',
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi xóa thành viên khỏi phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async updateClinicInfo(data: any): Promise<any> {
    try {
      const { id, ...updateData } = data;
      const result = await this.clinicRepositories.updateClinic(id, updateData);
      return {
        status: 'success',
        message: 'Cập nhật thông tin phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật thông tin phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }
}
