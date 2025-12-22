import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    queryAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('queryAnalytics', () => {
    const mockRequest = {
      user: {
        id: 'test-user-id',
        role: 'admin',
      },
      headers: {
        authorization: 'Bearer test-access-token',
      },
    };

    const mockBody = {
      message: 'Who is the top gem spender?',
      user_id: 'test-user-id',
    };

    it('should call service with correct parameters', async () => {
      const mockResponse = {
        message: 'Top Gem Spenders: User1 - 1000 gems',
        sender: 'Analytics',
      };

      mockAnalyticsService.queryAnalytics.mockResolvedValue(mockResponse);

      const result = await controller.queryAnalytics(mockRequest as any, mockBody);

      expect(service.queryAnalytics).toHaveBeenCalledWith(
        'test-user-id',
        'Who is the top gem spender?',
        'admin',
        'test-access-token',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use user_id from body if provided', async () => {
      const customBody = {
        message: 'My play time',
        user_id: 'custom-user-id',
      };

      mockAnalyticsService.queryAnalytics.mockResolvedValue({});

      await controller.queryAnalytics(mockRequest as any, customBody);

      expect(service.queryAnalytics).toHaveBeenCalledWith(
        'custom-user-id',
        'My play time',
        'admin',
        'test-access-token',
      );
    });

    it('should use user_id from request if not in body', async () => {
      const bodyWithoutUserId = {
        message: 'My play time',
      };

      mockAnalyticsService.queryAnalytics.mockResolvedValue({});

      await controller.queryAnalytics(mockRequest as any, bodyWithoutUserId);

      expect(service.queryAnalytics).toHaveBeenCalledWith(
        'test-user-id',
        'My play time',
        'admin',
        'test-access-token',
      );
    });

    it('should handle missing authorization header', async () => {
      const requestWithoutAuth = {
        user: {
          id: 'test-user-id',
          role: 'manager',
        },
        headers: {},
      };

      mockAnalyticsService.queryAnalytics.mockResolvedValue({});

      await controller.queryAnalytics(requestWithoutAuth as any, mockBody);

      expect(service.queryAnalytics).toHaveBeenCalledWith(
        'test-user-id',
        'Who is the top gem spender?',
        'manager',
        undefined,
      );
    });
  });
});

