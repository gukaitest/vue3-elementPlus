import { request } from '../request';

/** get Product list */
export function fetchGetProductList(params?: Api.DifficultiesPresentation.SelectOptimization) {
  return request<Api.productsList.ProductInfo>({
    url: '/products',
    method: 'get',
    params
  });
}
