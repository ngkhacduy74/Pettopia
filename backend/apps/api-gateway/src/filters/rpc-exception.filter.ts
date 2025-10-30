import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcToHttpExceptionFilter implements ExceptionFilter { 
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Lấy thông tin lỗi từ RPC exception
    const error = exception.getError();
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any | null = null;

    console.log('RPC Error:', error); // Log the raw error for debugging

    try {
      if (error && typeof error === 'object') {
        // Type assertion để tránh lỗi TypeScript
        const errorObj = error as any;
        const nestedError = errorObj.error || errorObj;
        
        // Lấy status code từ error object
        statusCode = nestedError.statusCode || nestedError.status || statusCode;
        
        // Lấy message từ error object
        message = nestedError.message || message;
        
        // Tạo bản sao của error để tránh thay đổi object gốc
        errorDetails = { ...errorObj };
        
        // Loại bỏ các trường đã có ở ngoài
        const fieldsToRemove = ['statusCode', 'status', 'message', 'error'];
        fieldsToRemove.forEach(field => {
          if (field in errorDetails) {
            delete errorDetails[field];
          }
        });
        
        // Nếu errorDetails rỗng sau khi xóa các trường không cần thiết
        if (Object.keys(errorDetails).length === 0) {
          errorDetails = null;
        }
      } else if (typeof error === 'string') {
        // Nếu error là chuỗi
        try {
          // Thử parse nếu là JSON string
          const parsedError = JSON.parse(error);
          statusCode = parsedError.statusCode || statusCode;
          message = parsedError.message || message;
          errorDetails = parsedError.error || null;
        } catch (e) {
          // Nếu không phải JSON, sử dụng làm message
          message = error;
        }
      }
    } catch (err) {
      console.error('Error processing RPC exception:', err);
      // Giữ nguyên giá trị mặc định nếu có lỗi khi xử lý
    }

    // Tạo response object
    const responseBody: any = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Thêm errorDetails nếu có
    if (errorDetails) {
      responseBody.error = errorDetails;
    }

    // Trả về response với status code tương ứng
    return response.status(statusCode).json(responseBody);
  }
}