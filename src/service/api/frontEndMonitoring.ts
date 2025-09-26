import { request } from '../request';

/** get Product list */
export function fetchGetPerformanceOptimizationList(params?: Api.DifficultiesPresentation.performanceOptimization) {
  return request<Api.performanceOptimization.performanceOptimizationList>({
    url: '/monitor/webvitals/stats',
    method: 'get',
    params
  });
}
