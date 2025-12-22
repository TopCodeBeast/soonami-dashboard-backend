import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queryAnalytics', () => {
    const mockUserId = 'test-user-id';
    const mockUserRole = 'admin';
    const mockMessage = 'Who is the top gem spender?';
    const mockAccessToken = 'test-access-token';

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.PYTHON_BACKEND_URL = 'http://localhost:8005';
    });

    it('should successfully forward analytics query to Python backend', async () => {
      const mockResponse = {
        data: {
          message: 'Top Gem Spenders: User1 - 1000 gems',
          sender: 'Analytics',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.queryAnalytics(
        mockUserId,
        mockMessage,
        mockUserRole,
        mockAccessToken,
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8005/chat/analytics',
        expect.stringContaining('message=@Analytics'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer test-access-token',
          },
          timeout: 30000,
        },
      );
    });

    it('should include user_id and role in form data', async () => {
      const mockResponse = {
        data: {
          message: 'Analytics response',
          sender: 'Analytics',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.queryAnalytics(
        mockUserId,
        mockMessage,
        mockUserRole,
        mockAccessToken,
      );

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as string;

      expect(formData).toContain(`user_id_param=${mockUserId}`);
      expect(formData).toContain(`user_role_param=${mockUserRole}`);
      expect(formData).toContain('message=@Analytics');
    });

    it('should handle errors from Python backend', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {
            message: 'Authentication required',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(
        service.queryAnalytics(mockUserId, mockMessage, mockUserRole, mockAccessToken),
      ).rejects.toThrow('Authentication required');
    });

    it('should handle connection errors', async () => {
      const mockError = {
        message: 'Connection refused',
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(
        service.queryAnalytics(mockUserId, mockMessage, mockUserRole, mockAccessToken),
      ).rejects.toThrow('Failed to connect to analytics service: Connection refused');
    });

    it('should work without access token', async () => {
      const mockResponse = {
        data: {
          message: 'Analytics response',
          sender: 'Analytics',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.queryAnalytics(mockUserId, mockMessage, mockUserRole);

      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2].headers;

      expect(headers.Authorization).toBeUndefined();
    });

    it('should use custom Python backend URL from environment', async () => {
      process.env.PYTHON_BACKEND_URL = 'http://custom-backend:8005';

      const mockResponse = {
        data: {
          message: 'Analytics response',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.queryAnalytics(mockUserId, mockMessage, mockUserRole);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://custom-backend:8005/chat/analytics',
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});

