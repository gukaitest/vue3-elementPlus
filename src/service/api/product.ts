import { request } from '../request';

/** get Product list */
export function fetchGetProductList(params?: Api.productsList.ProductSearchParams) {
  return request<Api.productsList.ProductInfo>({
    url: '/products',
    method: 'get',
    params
  });
}

/** delete Product */
export function fetchDeleteProduct(id: string) {
  return request<Api.productsList.ProductInfo>({
    url: `/products/${id}`,
    method: 'delete'
  });
}

/** create Product */
export function fetchCreateProduct(data: Partial<Api.productsList.Product>) {
  return request<Api.productsList.Product>({
    url: '/products',
    method: 'post',
    data
  });
}

/** update Product */
export function fetchUpdateProduct(id: string, data: Partial<Api.productsList.Product>) {
  return request<Api.productsList.Product>({
    url: `/products/${id}`,
    method: 'put',
    data
  });
}

/** batch delete Products */
export function fetchBatchDeleteProduct(ids: string[]) {
  return request<{ deletedCount: number }>({
    url: '/products/batch-delete',
    method: 'post',
    data: { ids }
  });
}
