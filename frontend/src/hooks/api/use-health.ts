import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  healthService,
  type WorkoutsParams,
  type SummaryParams,
} from '@/lib/api/services/health.service';
import type {
  TimeSeriesParams,
  SleepSessionsParams,
  BodySummaryParams,
} from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';
import { toast } from 'sonner';
import { queryClient } from '@/lib/query/client';

/**
 * Disconnect a user from a provider
 * Uses DELETE /api/v1/users/{user_id}/connections/{provider}
 */
export function useDisconnectProvider(provider: string, userId: string) {
  return useMutation({
    mutationFn: () => healthService.disconnectProvider(userId, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.connections.all(userId),
      });
      toast.success(`Disconnected from ${provider}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to disconnect';
      toast.error(message);
    },
  });
}

/**
 * Get user connections for a user
 * Uses GET /api/v1/users/{user_id}/connections
 */
export function useUserConnections(userId: string) {
  return useQuery({
    queryKey: queryKeys.connections.all(userId),
    queryFn: () => healthService.getUserConnections(userId),
    enabled: !!userId,
  });
}

/**
 * Get workouts for a user
 * Uses GET /api/v1/users/{user_id}/workouts
 */
export function useWorkouts(userId: string, params?: WorkoutsParams) {
  return useQuery({
    queryKey: queryKeys.health.workouts(userId, params),
    queryFn: () => healthService.getWorkouts(userId, params),
    enabled: !!userId,
  });
}

/**
 * Get time series data for a user
 * Uses GET /api/v1/users/{user_id}/timeseries
 */
export function useTimeSeries(userId: string, params: TimeSeriesParams) {
  return useQuery({
    queryKey: queryKeys.health.timeseries(userId, params),
    queryFn: () => healthService.getTimeSeries(userId, params),
    enabled: !!userId && !!params.start_time && !!params.end_time,
  });
}

/**
 * Get sleep sessions for a user
 * Uses GET /api/v1/users/{user_id}/events/sleep
 */
export function useSleepSessions(userId: string, params: SleepSessionsParams) {
  return useQuery({
    queryKey: queryKeys.health.sleepSessions(userId, params),
    queryFn: () => healthService.getSleepSessions(userId, params),
    enabled: !!userId && !!params.start_date && !!params.end_date,
  });
}

/**
 * Get sleep summaries for a user
 * Uses GET /api/v1/users/{user_id}/summaries/sleep
 */
export function useSleepSummaries(userId: string, params: SummaryParams) {
  return useQuery({
    queryKey: queryKeys.health.sleepSummaries(userId, params),
    queryFn: () => healthService.getSleepSummaries(userId, params),
    enabled: !!userId && !!params.start_date && !!params.end_date,
  });
}

/**
 * Get activity summaries for a user
 * Uses GET /api/v1/users/{user_id}/summaries/activity
 */
export function useActivitySummaries(userId: string, params: SummaryParams) {
  return useQuery({
    queryKey: queryKeys.health.activitySummaries(userId, params),
    queryFn: () => healthService.getActivitySummaries(userId, params),
    enabled: !!userId && !!params.start_date && !!params.end_date,
  });
}

/**
 * Get body summary for a user (static, averaged, latest metrics)
 * Uses GET /api/v1/users/{user_id}/summaries/body
 */
export function useBodySummary(userId: string, params?: BodySummaryParams) {
  return useQuery({
    queryKey: queryKeys.health.bodySummary(userId, params),
    queryFn: () => healthService.getBodySummary(userId, params),
    enabled: !!userId,
  });
}

/**
 * Fetch ALL pages of timeseries data automatically.
 *
 * The timeseries endpoint returns at most 100 items per page. This hook
 * uses React Query's infinite query under the hood and keeps fetching
 * until every page has been retrieved — giving you the full dataset in
 * one flat array.
 *
 * Safe to call for any date range; calls go to our local backend
 * (PostgreSQL), so there are no external rate-limit concerns.
 */
export function useAllTimeSeries(
  userId: string,
  params: Omit<TimeSeriesParams, 'cursor' | 'limit'>
) {
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.health.timeseries(userId, params), 'all-pages'],
    queryFn: ({ pageParam }) =>
      healthService.getTimeSeries(userId, {
        ...params,
        cursor: (pageParam as string | undefined) ?? undefined,
        limit: 100,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more
        ? (lastPage.pagination.next_cursor ?? undefined)
        : undefined,
    enabled: !!userId && !!params.start_time && !!params.end_time,
  });

  // Auto-trigger the next page as soon as the previous one lands
  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const allData = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data]
  );

  return {
    data: allData,
    isLoading:
      query.isLoading || query.hasNextPage === true || query.isFetchingNextPage,
  };
}

/**
 * Synchronize workouts/exercises/activities from fitness provider API for a specific user
 */
export function useSynchronizeDataFromProvider(
  provider: string,
  userId: string
) {
  return useMutation({
    mutationFn: () => healthService.synchronizeProvider(provider, userId),
    onSuccess: () => {
      // Invalidate connection and workout data
      queryClient.invalidateQueries({
        queryKey: queryKeys.connections.all(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.health.workouts(userId),
      });

      // Auto-refresh data sections when sync completes
      queryClient.invalidateQueries({
        queryKey: queryKeys.health.activitySummaries(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.health.sleepSessions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.health.bodySummary(userId),
      });

      toast.success('Data synchronized successfully');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to synchronize data';
      toast.error(message);
    },
  });
}

/**
 * Get Garmin backfill status (webhook-based, 30-day sync)
 * Polls every 10 seconds while backfill is in progress
 */
export function useGarminBackfillStatus(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.garmin.backfillStatus(userId),
    queryFn: () => healthService.getGarminBackfillStatus(userId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.overall_status;
      // Poll while in_progress OR retry_in_progress
      return status === 'in_progress' || status === 'retry_in_progress'
        ? 10000
        : false;
    },
  });
}

/**
 * Cancel an in-progress Garmin backfill
 * Sets cancellation flag; backfill stops after current type completes
 */
export function useGarminCancelBackfill(userId: string) {
  return useMutation({
    mutationFn: () => healthService.cancelGarminBackfill(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.garmin.backfillStatus(userId),
      });
      toast.info('Backfill cancellation requested');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel backfill';
      toast.error(message);
    },
  });
}

/**
 * Retry Garmin backfill for a specific failed type
 */
export function useRetryGarminBackfill(userId: string) {
  return useMutation({
    mutationFn: (typeName: string) =>
      healthService.retryGarminBackfill(userId, typeName),
    onSuccess: (_, typeName) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.garmin.backfillStatus(userId),
      });
      toast.info(`Retrying ${typeName} sync...`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to retry sync';
      toast.error(message);
    },
  });
}
