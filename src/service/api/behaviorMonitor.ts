import { request } from '../request';

/** 获取用户行为列表 */
export function fetchGetUserBehaviors(params?: Api.UserBehavior.BehaviorSearchParams) {
  return request<Api.UserBehavior.BehaviorList>({
    url: '/monitor/behaviors',
    method: 'get',
    params
  });
}
