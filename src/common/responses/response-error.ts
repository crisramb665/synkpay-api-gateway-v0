export class ResponseError extends Error {
    success: boolean;
    code: number;
    timestamp?: string;
  
    constructor(message: string, code: number, includeTimestamp = true) {
      super(message);
      this.name = 'ResponseError';
      this.success = false;
      this.code = code;
      this.message = message;
      if (includeTimestamp) {
        this.timestamp = new Date().toISOString();
      }
  
      Object.setPrototypeOf(this, ResponseError.prototype); 
    }
  }
  
  