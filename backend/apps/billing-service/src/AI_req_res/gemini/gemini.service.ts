import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GenerativeModel } from '@google/generative-ai';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  ChatCompletionMessageDto,
  CreateChatCompletionRequest,
} from '../openai/dto/create-chat-completion.request';
import { ConversationService } from './conversation.service';

@Injectable()
export class GeminiService {
  constructor(
    @Inject('GEMINI_MODEL') private readonly model: GenerativeModel,
    private readonly conversationService: ConversationService,
    @Inject('HEALTHCARE_SERVICE')
    private readonly healthcareService: ClientProxy,
    @Inject('PARTNER_SERVICE')
    private readonly partnerService: ClientProxy,
  ) {}

  async createChatCompletion(request: CreateChatCompletionRequest) {
    try {
      let { messages, userId, conversationId } = request;

      console.log('createChatCompletion called with:', {
        userId,
        conversationId,
        messagesCount: messages?.length,
      });

      let allMessages: ChatCompletionMessageDto[] = [];
      if (conversationId) {
        try {
          const history = await this.conversationService.getConversationHistory(
            conversationId,
            userId,
          );
          allMessages = [...history];
        } catch (error) {
          console.error('Error getting conversation history:', error);
          // Tiếp tục với messages mới nếu không lấy được history
        }
      } else {
        try {
          const latest =
            await this.conversationService.getLatestConversation(userId);
          if (latest) {
            conversationId = latest.conversationId;
            const history =
              await this.conversationService.getConversationHistory(
                latest.conversationId,
                userId,
              );
            allMessages = [...history];
          }
        } catch (error) {
          console.error('Error getting latest conversation:', error);
          // Tiếp tục với messages mới nếu không lấy được latest conversation
        }
      }

      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          allMessages.push(m);
        }
      }

      // Đảm bảo có ít nhất một message
      if (allMessages.length === 0) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Messages array cannot be empty',
          error: 'Bad Request',
        });
      }

      const lastUserMessage =
        allMessages.filter((m) => m.role === 'user').pop()?.content || '';

      let contextData = '';
      const intent = this.detectUserIntent(lastUserMessage);
      const clinicId = request.clinicId || intent.clinicId;
      const vetId = request.vetId || intent.vetId;
      const date = intent.date;

      const userRole = request.role;
      const isClinicOrVet = this.isClinicOrVet(userRole);

      const isAskingAboutSlots =
        date ||
        lastUserMessage.toLowerCase().includes('trống') ||
        lastUserMessage.toLowerCase().includes('available') ||
        intent.type === 'available_slots';

      // Chỉ lấy context data khi có thông tin cần thiết (giữ nguyên các chức năng đã có)
      if (intent.type === 'clinic_appointments' && clinicId) {
        contextData = await this.getClinicAppointmentsInfo(
          clinicId,
          intent.date,
          userRole,
        );
      } else if (clinicId && isAskingAboutSlots) {
        if (isClinicOrVet) {
          contextData = await this.getClinicAppointmentsInfo(
            clinicId,
            date,
            userRole,
          );
        } else {
          contextData = await this.getAvailableSlotsInfo(clinicId, date);
        }
      } else if (
        clinicId &&
        (lastUserMessage.toLowerCase().includes('lịch làm việc phòng khám') ||
          lastUserMessage.toLowerCase().includes('clinic schedule') ||
          intent.type === 'clinic_schedule')
      ) {
        contextData = await this.getClinicScheduleInfo(clinicId);
      } else if (vetId || (intent.type === 'vet_schedule' && intent.vetId)) {
        contextData = await this.getVetScheduleInfo(
          vetId || intent.vetId,
          clinicId,
        );
      } else if (intent.type !== 'none') {
        if (intent.type === 'available_slots') {
          if (isClinicOrVet && intent.clinicId) {
            contextData = await this.getClinicAppointmentsInfo(
              intent.clinicId,
              intent.date,
              userRole,
            );
          } else {
            contextData = await this.getAvailableSlotsInfo(
              intent.clinicId,
              intent.date,
            );
          }
        } else if (intent.type === 'clinic_schedule') {
          contextData = await this.getClinicScheduleInfo(intent.clinicId);
        } else if (intent.type === 'vet_schedule') {
          contextData = await this.getVetScheduleInfo(
            intent.vetId,
            intent.clinicId,
          );
        } else if (intent.type === 'clinic_appointments' && intent.clinicId) {
          contextData = await this.getClinicAppointmentsInfo(
            intent.clinicId,
            intent.date,
            userRole,
          );
        }
      }
      // Nếu không có context data đặc biệt, hệ thống sẽ hoạt động như chatbot bình thường
      // (không cần làm gì thêm, chỉ gửi messages đến AI)

      const slotResponseGuideline = `\n[LƯU Ý TRẢ LỜI]\n- Tránh dùng các cụm như "còn nhiều chỗ trống", "còn slot".\n- Diễn đạt mức độ đông bằng các cụm "chưa có nhiều người đăng ký khám" hoặc "đã có nhiều người đăng ký khám".\n- Kết thúc câu trả lời bằng câu "Bạn hãy đặt ca để được chúng tôi xem xét sớm nhất."\n`;

      let systemContext = '';
      if (contextData) {
        systemContext = `\n\n[THÔNG TIN HỆ THỐNG]\n${contextData}\n${slotResponseGuideline}\nHãy sử dụng thông tin trên để trả lời câu hỏi của người dùng một cách chính xác và hữu ích.`;
      }

      const contents = allMessages
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }],
        }))
        .filter((c) => c.parts[0].text.trim().length > 0); // Lọc bỏ messages rỗng

      // Đảm bảo có ít nhất một message hợp lệ
      if (contents.length === 0) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'No valid messages found',
          error: 'Bad Request',
        });
      }

      if (systemContext && contents.length > 0) {
        for (let i = contents.length - 1; i >= 0; i--) {
          if (contents[i].role === 'user') {
            contents[i].parts[0].text += systemContext;
            break;
          }
        }
      }

      const result = await this.model.generateContent({ contents });
      const response = result.response;

      // Lấy nội dung response một cách an toàn
      let responseText = '';
      try {
        responseText = response.text();
      } catch (error) {
        console.error('Error getting response text:', error);
        // Nếu không lấy được text, thử lấy từ candidates
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            responseText =
              candidate.content.parts[0].text ||
              'Xin lỗi, tôi không thể tạo phản hồi lúc này.';
          } else {
            responseText = 'Xin lỗi, tôi không thể tạo phản hồi lúc này.';
          }
        } else {
          responseText = 'Xin lỗi, tôi không thể tạo phản hồi lúc này.';
        }
      }

      const assistantResponse: ChatCompletionMessageDto = {
        role: 'assistant',
        content: responseText,
      };

      let conversation;
      try {
        conversation = await this.conversationService.getOrCreateConversation(
          userId,
          conversationId,
        );
      } catch (error) {
        console.error('Error getting or creating conversation:', error);
        // Nếu không lưu được conversation, vẫn trả về response
        return {
          conversationId: conversationId || 'temp',
          role: 'assistant',
          content: responseText,
          candidates: response.candidates,
          usageMetadata: response.usageMetadata,
        };
      }

      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          if (m.role === 'user') {
            try {
              await this.conversationService.addMessage(
                conversation.conversationId,
                userId,
                m,
              );
            } catch (error) {
              console.error('Error adding user message:', error);
              // Tiếp tục nếu không lưu được message
            }
          }
        }
      }

      try {
        await this.conversationService.addMessage(
          conversation.conversationId,
          userId,
          assistantResponse,
        );
      } catch (error) {
        console.error('Error adding assistant message:', error);
        // Vẫn trả về response nếu không lưu được
      }

      return {
        conversationId: conversation.conversationId,
        role: 'assistant',
        content: responseText,
        candidates: response.candidates,
        usageMetadata: response.usageMetadata,
      };
    } catch (err: any) {
      console.error('Error in createChatCompletion:', err);

      if (err instanceof RpcException) {
        throw err;
      }

      const statusFromSdk: number | undefined = err?.status || err?.statusCode;
      const messageFromSdk: string | undefined =
        err?.message || err?.error?.message;
      const code: string | undefined = err?.code || err?.error?.code;
      const statusToThrow =
        typeof statusFromSdk === 'number'
          ? statusFromSdk
          : HttpStatus.INTERNAL_SERVER_ERROR;

      throw new RpcException({
        statusCode: statusToThrow,
        errorCode: code ?? 'unknown_error',
        message:
          messageFromSdk ?? 'Failed to create chat completion from Gemini API.',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private detectUserIntent(message: string): {
    type:
      | 'available_slots'
      | 'clinic_schedule'
      | 'vet_schedule'
      | 'clinic_appointments'
      | 'none';
    clinicId?: string;
    vetId?: string;
    date?: string;
  } {
    const lowerMessage = message.toLowerCase();

    const availableSlotKeywords = [
      'lịch trống',
      'ca trống',
      'slot trống',
      'còn trống',
      'có thể đặt',
      'available',
      'rảnh',
      'trống',
      'còn chỗ',
      'còn slot',
    ];

    // Keywords cho câu hỏi về lịch hẹn (appointments)
    const appointmentKeywords = [
      'lịch hẹn',
      'appointment',
      'appointments',
      'đặt lịch',
      'đã đặt',
      'số lượng lịch',
      'bao nhiêu lịch',
      'danh sách lịch hẹn',
    ];

    const clinicScheduleKeywords = [
      'lịch làm việc phòng khám',
      'lịch phòng khám',
      'ca làm việc phòng khám',
      'clinic schedule',
      'lịch clinic',
    ];

    const vetScheduleKeywords = [
      'lịch làm việc bác sĩ',
      'lịch bác sĩ',
      'lịch vet',
      'vet schedule',
      'lịch thú y',
    ];

    // Kiểm tra câu hỏi về appointments trước
    if (appointmentKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      const uuidRegex =
        /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
      const uuids = message.match(uuidRegex) || [];

      const datePatterns = [
        /\d{4}-\d{2}-\d{2}/, // 2024-11-11
        /\d{2}\/\d{2}\/\d{4}/, // 11/11/2024
        /\d{1,2}\/\d{1,2}\/\d{4}/, // 1/11/2024
        /\d{1,2}\/\d{1,2}/, // 11/11 (day/month)
      ];

      let dateMatch: string | undefined;
      for (const pattern of datePatterns) {
        const match = message.match(pattern);
        if (match) {
          dateMatch = match[0];
          break;
        }
      }

      return {
        type: 'clinic_appointments',
        clinicId: uuids[0],
        date: dateMatch,
      };
    }

    if (
      availableSlotKeywords.some((keyword) => lowerMessage.includes(keyword))
    ) {
      const uuidRegex =
        /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
      const uuids = message.match(uuidRegex) || [];

      const datePatterns = [
        /\d{4}-\d{2}-\d{2}/, // 2024-11-11
        /\d{2}\/\d{2}\/\d{4}/, // 11/11/2024
        /\d{1,2}\/\d{1,2}\/\d{4}/, // 1/11/2024
        /\d{1,2}\/\d{1,2}/, // 11/11 (day/month)
      ];

      let dateMatch: string | undefined;
      for (const pattern of datePatterns) {
        const match = message.match(pattern);
        if (match) {
          dateMatch = match[0];
          break;
        }
      }

      return {
        type: 'available_slots',
        clinicId: uuids[0],
        date: dateMatch,
      };
    }

    if (
      clinicScheduleKeywords.some((keyword) => lowerMessage.includes(keyword))
    ) {
      const uuidRegex =
        /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
      const uuids = message.match(uuidRegex) || [];

      return {
        type: 'clinic_schedule',
        clinicId: uuids[0],
      };
    }

    if (vetScheduleKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      const uuidRegex =
        /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
      const uuids = message.match(uuidRegex) || [];

      return {
        type: 'vet_schedule',
        vetId: uuids[0],
        clinicId: uuids[1] || uuids[0],
      };
    }

    return { type: 'none' };
  }

  private async getAvailableSlotsInfo(
    clinicId?: string,
    date?: string,
  ): Promise<string> {
    try {
      if (!clinicId) {
        return 'Để kiểm tra lịch trống, vui lòng cung cấp clinic_id (UUID) của phòng khám trong câu hỏi. Ví dụ: "Phòng khám [clinic_id] còn ca nào trống ngày 11/11?"';
      }

      console.log(`Fetching shifts for clinic: ${clinicId}`);

      const shiftsResponse = await lastValueFrom(
        this.partnerService.send(
          { cmd: 'getShiftsByClinicId' },
          { clinic_id: clinicId },
        ),
      ).catch((error) => {
        console.error('Error fetching shifts from partner service:', error);
        return null;
      });

      console.log('Shifts response:', JSON.stringify(shiftsResponse, null, 2));

      if (!shiftsResponse) {
        console.warn('No response from partner service');
        return 'Không thể kết nối đến dịch vụ phòng khám. Vui lòng thử lại sau.';
      }

      if (!shiftsResponse.data) {
        console.warn('Response has no data field:', shiftsResponse);
        return 'Không tìm thấy ca làm việc cho phòng khám này.';
      }

      if (!Array.isArray(shiftsResponse.data)) {
        console.warn(
          'Data is not an array:',
          typeof shiftsResponse.data,
          shiftsResponse.data,
        );
        return 'Không tìm thấy ca làm việc cho phòng khám này.';
      }

      if (shiftsResponse.data.length === 0) {
        console.log(`No shifts found for clinic ${clinicId}`);
        return 'Không tìm thấy ca làm việc cho phòng khám này.';
      }

      const shifts = shiftsResponse.data;
      console.log(`Found ${shifts.length} shifts for clinic ${clinicId}`);

      const activeShifts = shifts.filter((s) => s.is_active);
      console.log(
        `Active shifts: ${activeShifts.length} out of ${shifts.length}`,
      );

      if (activeShifts.length === 0) {
        return 'Phòng khám này hiện không có ca làm việc đang hoạt động.';
      }

      let result = 'GỢI Ý LỊCH TRỐNG:\n\n';
      let bestShiftSuggestion = '';
      let bestShiftScore = -1;

      for (const shift of shifts) {
        if (!shift.is_active) {
          console.log(`Skipping inactive shift: ${shift.shift}`);
          continue;
        }

        let targetDate = new Date();
        if (date) {
          try {
            if (date.includes('/')) {
              const parts = date.split('/').map((p) => parseInt(p));
              if (parts.length === 2) {
                const [day, month] = parts;
                const year = new Date().getFullYear();
                targetDate = new Date(year, month - 1, day);
              } else if (parts.length === 3) {
                const [day, month, year] = parts;
                targetDate = new Date(year, month - 1, day);
              }
            } else if (date.includes('-')) {
              targetDate = new Date(date);
            }

            if (isNaN(targetDate.getTime())) {
              console.warn(`Invalid date format: ${date}, using today's date`);
              targetDate = new Date();
            }
          } catch (error) {
            console.error(`Error parsing date: ${date}`, error);
            targetDate = new Date();
          }
        }

        targetDate.setHours(0, 0, 0, 0);

        const appointmentsResponse = await lastValueFrom(
          this.healthcareService.send(
            { cmd: 'getAppointments' },
            {
              role: 'Admin',
              clinicId,
              page: 1,
              limit: 1000,
            },
          ),
        ).catch((error) => {
          console.error('Error fetching appointments:', error);
          return null;
        });

        let bookedCount = 0;
        if (appointmentsResponse && appointmentsResponse.data) {
          const targetDateStart = new Date(targetDate);
          targetDateStart.setHours(0, 0, 0, 0);
          const targetDateEnd = new Date(targetDate);
          targetDateEnd.setHours(23, 59, 59, 999);

          bookedCount = appointmentsResponse.data.filter((apt: any) => {
            if (!apt.date) return false;

            const aptDate = new Date(apt.date);

            const isSameDate =
              aptDate >= targetDateStart && aptDate <= targetDateEnd;

            const isSameShift = apt.shift === shift.shift;

            const isNotCancelled =
              apt.status !== 'Cancelled' && apt.status !== 'Cancel';

            return isSameDate && isSameShift && isNotCancelled;
          }).length;

          console.log(
            `Shift ${shift.shift} on ${targetDate.toISOString().split('T')[0]}:`,
            {
              totalAppointments: appointmentsResponse.data.length,
              bookedCount,
              maxSlots: shift.max_slot,
              availableSlots: shift.max_slot - bookedCount,
            },
          );
        }

        const availableSlots = Math.max(0, shift.max_slot - bookedCount);

        const availabilityRatio =
          shift.max_slot > 0 ? availableSlots / shift.max_slot : 0;

        let suggestion = '';
        if (availableSlots <= 0) {
          suggestion =
            'Ca này đã có nhiều người đặt lịch khám và hiện đã kín, bạn vui lòng chọn khung giờ khác.';
        } else if (availabilityRatio >= 0.6) {
          suggestion =
            'Ca này chưa có nhiều người đặt lịch khám, bạn có thể cân nhắc đặt để chủ động thời gian.';
        } else {
          suggestion =
            'Ca này đã có nhiều người đặt lịch khám, bạn nên xác nhận sớm nếu muốn khung giờ này.';
        }

        const shiftLabel = `Ca ${shift.shift} (${shift.start_time} - ${shift.end_time})`;
        result += `${shiftLabel}: ${suggestion}\n\n`;

        if (availableSlots > 0 && availabilityRatio > bestShiftScore) {
          bestShiftScore = availabilityRatio;
          bestShiftSuggestion = shiftLabel;
        }
      }

      if (result === 'GỢI Ý LỊCH TRỐNG:\n\n') {
        return 'Không tìm thấy ca làm việc đang hoạt động cho phòng khám này.';
      }

      if (bestShiftSuggestion) {
        result += `Gợi ý nên đặt: ${bestShiftSuggestion} vì chưa có nhiều người đặt lịch khám.\n`;
      }

      result += 'Bạn hãy đặt ca để được chúng tôi xem xét sớm nhất.';

      return result;
    } catch (error) {
      console.error('Error getting available slots:', error);
      return 'Không thể lấy thông tin lịch trống. Vui lòng thử lại sau.';
    }
  }

  private async getClinicScheduleInfo(clinicId?: string): Promise<string> {
    try {
      if (!clinicId) {
        return 'Vui lòng cung cấp clinic_id để xem lịch làm việc.';
      }

      const shiftsResponse = await lastValueFrom(
        this.partnerService.send(
          { cmd: 'getShiftsByClinicId' },
          { clinic_id: clinicId },
        ),
      ).catch(() => null);

      if (
        !shiftsResponse ||
        !shiftsResponse.data ||
        shiftsResponse.data.length === 0
      ) {
        return 'Không tìm thấy lịch làm việc cho phòng khám này.';
      }

      const shifts = shiftsResponse.data;
      let result = 'LỊCH LÀM VIỆC PHÒNG KHÁM:\n\n';

      for (const shift of shifts) {
        result += `Ca ${shift.shift}:\n`;
        result += `  - Thời gian: ${shift.start_time} - ${shift.end_time}\n`;
        result += `  - Số slot tối đa: ${shift.max_slot}\n`;
        result += `  - Trạng thái: ${shift.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}\n\n`;
      }

      return result;
    } catch (error) {
      console.error('Error getting clinic schedule:', error);
      return 'Không thể lấy lịch làm việc. Vui lòng thử lại sau.';
    }
  }

  private isClinicOrVet(role?: string | string[]): boolean {
    if (!role) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.some(
      (r) => r.toLowerCase() === 'clinic' || r.toLowerCase() === 'vet',
    );
  }

  private async getClinicAppointmentsInfo(
    clinicId: string,
    date?: string,
    role?: string | string[],
  ): Promise<string> {
    try {
      if (!clinicId) {
        return 'Vui lòng cung cấp clinic_id để xem lịch làm việc.';
      }

      // Parse date
      let targetDate = new Date();
      if (date) {
        try {
          if (date.includes('/')) {
            const parts = date.split('/').map((p) => parseInt(p));
            if (parts.length === 2) {
              const [day, month] = parts;
              const year = new Date().getFullYear();
              targetDate = new Date(year, month - 1, day);
            } else if (parts.length === 3) {
              const [day, month, year] = parts;
              targetDate = new Date(year, month - 1, day);
            }
          } else if (date.includes('-')) {
            targetDate = new Date(date);
          }

          if (isNaN(targetDate.getTime())) {
            targetDate = new Date();
          }
        } catch (error) {
          console.error(`Error parsing date: ${date}`, error);
          targetDate = new Date();
        }
      }

      targetDate.setHours(0, 0, 0, 0);
      const targetDateStart = new Date(targetDate);
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      const roleArray = Array.isArray(role) ? role : role ? [role] : ['Clinic'];

      const appointmentsResponse = await lastValueFrom(
        this.healthcareService.send(
          { cmd: 'getAppointments' },
          {
            role: roleArray,
            clinicId,
            page: 1,
            limit: 1000,
          },
        ),
      ).catch((error) => {
        console.error('Error fetching appointments:', error);
        return null;
      });

      if (!appointmentsResponse || !appointmentsResponse.data) {
        return `Không tìm thấy lịch hẹn nào cho phòng khám vào ngày ${targetDate.toLocaleDateString('vi-VN')}.`;
      }

      // Filter appointments theo ngày
      const appointmentsOnDate = appointmentsResponse.data.filter(
        (apt: any) => {
          if (!apt.date) return false;
          const aptDate = new Date(apt.date);
          return aptDate >= targetDateStart && aptDate <= targetDateEnd;
        },
      );

      if (appointmentsOnDate.length === 0) {
        return `Không có lịch hẹn nào vào ngày ${targetDate.toLocaleDateString('vi-VN')}.`;
      }

      // Group by shift
      const appointmentsByShift: { [key: string]: any[] } = {};
      for (const apt of appointmentsOnDate) {
        const shift = apt.shift || 'Unknown';
        if (!appointmentsByShift[shift]) {
          appointmentsByShift[shift] = [];
        }
        appointmentsByShift[shift].push(apt);
      }

      let result = `LỊCH LÀM VIỆC NGÀY ${targetDate.toLocaleDateString('vi-VN')}:\n\n`;
      result += `Tổng số lịch hẹn: ${appointmentsOnDate.length}\n\n`;

      // Hiển thị theo từng ca
      const shiftOrder = ['Morning', 'Afternoon', 'Evening'];
      for (const shift of shiftOrder) {
        const apts = appointmentsByShift[shift] || [];
        if (apts.length > 0) {
          result += `**Ca ${shift}:**\n`;
          for (const apt of apts) {
            const aptDate = new Date(apt.date);
            const timeStr = aptDate.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            result += `  - ${timeStr}: `;
            result += `Trạng thái: ${apt.status || 'Pending'}`;
            if (apt.customer_email) {
              result += ` | Email: ${apt.customer_email}`;
            }
            if (apt.customer_phone) {
              result += ` | SĐT: ${apt.customer_phone}`;
            }
            result += `\n`;
          }
          result += `\n`;
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting clinic appointments:', error);
      return 'Không thể lấy thông tin lịch làm việc. Vui lòng thử lại sau.';
    }
  }

  private async getVetScheduleInfo(
    vetId?: string,
    clinicId?: string,
  ): Promise<string> {
    try {
      if (!vetId && !clinicId) {
        return 'Vui lòng cung cấp vet_id hoặc clinic_id để xem lịch làm việc.';
      }

      if (clinicId) {
        const shiftsResponse = await lastValueFrom(
          this.partnerService.send(
            { cmd: 'getShiftsByClinicId' },
            { clinic_id: clinicId },
          ),
        ).catch(() => null);

        if (shiftsResponse && shiftsResponse.data) {
          let result = 'LỊCH LÀM VIỆC BÁC SĨ:\n\n';
          result += `Phòng khám ID: ${clinicId}\n`;
          if (vetId) {
            result += `Bác sĩ ID: ${vetId}\n`;
          }
          result += '\nCác ca làm việc:\n\n';

          for (const shift of shiftsResponse.data) {
            if (!shift.is_active) continue;
            result += `- Ca ${shift.shift}: ${shift.start_time} - ${shift.end_time}\n`;
          }

          return result;
        }
      }

      return 'Không tìm thấy lịch làm việc cho bác sĩ này.';
    } catch (error) {
      console.error('Error getting vet schedule:', error);
      return 'Không thể lấy lịch làm việc. Vui lòng thử lại sau.';
    }
  }
}
