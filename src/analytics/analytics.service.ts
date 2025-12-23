import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AnalyticsService {
  private readonly pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8005';

  constructor() {
    if (!process.env.PYTHON_BACKEND_URL) {
      console.warn('⚠️ PYTHON_BACKEND_URL not set in environment variables. Defaulting to http://localhost:8005');
    } else {
      console.log(`✅ Analytics service configured to use Python backend: ${this.pythonBackendUrl}`);
    }
  }

  async queryAnalytics(userId: string, message: string, userRole: string, accessToken?: string) {
    try {
      // Forward the request to Python backend
      // The Python backend will handle the analytics query
      // Pass user_id, role, and access_token so Python backend can authenticate
      const formData = new URLSearchParams();
      formData.append('message', `@Analytics ${message}`);
      formData.append('user_id_param', userId);
      formData.append('user_role_param', userRole);
      
      const headers: any = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      
      // Pass the access token in Authorization header so Python backend can use it
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await axios.post(
        `${this.pythonBackendUrl}/chat/analytics`,
        formData.toString(),
        {
          headers,
          // Send as form data
          timeout: 30000,
        },
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        const errorMessage = 
          errorData?.message || 
          errorData?.detail || 
          errorData?.error ||
          `Analytics query failed: ${error.response.statusText}`;
        
        throw new Error(errorMessage);
      }
      const errorMsg = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND'
        ? `Failed to connect to Python backend at ${this.pythonBackendUrl}. Please check PYTHON_BACKEND_URL environment variable.`
        : `Failed to connect to analytics service: ${error.message}`;
      throw new Error(errorMsg);
    }
  }
}

