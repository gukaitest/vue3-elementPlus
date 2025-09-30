import { request } from '../request';

/** get error list */
export function fetchGetErrorList(params?: Api.ErrorMonitor.ErrorSearchParams) {
  return request<Api.ErrorMonitor.ErrorList>({
    url: '/monitor/errors',
    method: 'get',
    params
  });
}

/** report error */
export function fetchReportError(data: Api.ErrorMonitor.ErrorReportRequest) {
  return request<Api.ErrorMonitor.ErrorReportResponse>({
    url: '/monitor/errors',
    method: 'post',
    data
  });
}

/** batch report errors */
export function fetchBatchReportErrors(data: Api.ErrorMonitor.BatchErrorReportRequest) {
  return request<Api.ErrorMonitor.ErrorReportResponse>({
    url: '/monitor/errors/batch',
    method: 'post',
    data
  });
}

/** get error statistics */
export function fetchGetErrorStats(params?: {
  startTime?: number;
  endTime?: number;
  userId?: string;
  sessionId?: string;
}) {
  return request<Api.ErrorMonitor.ErrorStats>({
    url: '/monitor/errors/stats',
    method: 'get',
    params
  });
}

/** get error detail */
export function fetchGetErrorDetail(errorId: string) {
  return request<Api.ErrorMonitor.ErrorInfo>({
    url: `/monitor/errors/${errorId}`,
    method: 'get'
  });
}

/** delete error */
export function fetchDeleteError(errorId: string) {
  return request<{ success: boolean }>({
    url: `/monitor/errors/${errorId}`,
    method: 'delete'
  });
}

/** clear all errors */
export function fetchClearAllErrors() {
  return request<{ success: boolean }>({
    url: '/monitor/errors/clear',
    method: 'delete'
  });
}
