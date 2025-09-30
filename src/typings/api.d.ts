/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  /** namespace products 接口返回类型 backend api module: "products" */
  namespace productsList {
    // 使用 interface 定义 Product 类型
    interface Product {
      _id: string;
      product_id: number;
      product_name: string;
      price: number;
      category: string;
      stock: number;
      description: string;
      created_at: string;
      updated_at: string;
    }
    // 使用 interface 定义 Data 类型
    interface ProductInfo {
      products: Product[];
      total: number;
    }
    // 使用 interface 定义 Data 类型
  }
  namespace performanceOptimization {
    // 对应的后端字段如下：summaryData	_id	name	value	rating	delta	id	navigationType	timestamp	url	userAgent	taskType	leakType	created_at	__v
    interface performanceOptimization {
      name?: string;
      _id?: string;
      value?: string;
      rating?: string;
      delta?: string;
      // id?: string;
      navigationType?: string;
      timestamp?: string;
      url?: string;
      userAgent?: string;
      taskType?: string;
      leakType?: string;
      created_at?: string;
      // summaryData: string;
      __v?: string;
    }
    interface performanceOptimizationList {
      list: performanceOptimization[];
      total: number;
    }
  }
  namespace Common {
    /** common params of paginating */
    interface PaginatingCommonParams {
      /** current page number */
      current: number;
      /** page size */
      size: number;
      /** total count */
      total: number;
    }

    /** common params of paginating query list data */
    interface PaginatingQueryRecord<T = any> extends PaginatingCommonParams {
      records: T[];
    }

    /** common search params of table */
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    /**
     * enable status
     *
     * - "1": enabled
     * - "2": disabled
     */
    type EnableStatus = '1' | '2';

    /** common record */
    type CommonRecord<T = any> = {
      /** record id */
      id: number;
      /** record creator */
      createBy: string;
      /** record create time */
      createTime: string;
      /** record updater */
      updateBy: string;
      /** record update time */
      updateTime: string;
      /** record status */
      status: EnableStatus | undefined;
    } & T;
  }

  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      refreshToken: string;
    }

    interface UserInfo {
      userId: string;
      userName: string;
      roles: string[];
      buttons: string[];
    }
  }
  /**
   * namespace Auth
   *
   * backend api module: "auth" 请求参数
   */
  namespace DifficultiesPresentation {
    interface SelectOptimization {
      search: string;
      pageNo: number;
      pageSize: number;
    }
    interface performanceOptimization {
      name?: string;
      rating?: string;
      pageNo: number;
      pageSize: number;
    }

    interface LargeFileUpload {
      userId: string;
      userName: string;
      roles: string[];
      buttons: string[];
    }
  }

  /**
   * namespace ErrorMonitor
   *
   * backend api module: "errorMonitor"
   */
  namespace ErrorMonitor {
    /** 错误类型枚举 */
    type ErrorType = 'javascript' | 'vue' | 'promise' | 'resource' | 'ajax' | 'custom';

    /** 错误级别枚举 */
    type ErrorLevel = 'low' | 'medium' | 'high' | 'critical';

    /** 错误信息接口 */
    interface ErrorInfo {
      // 基础信息
      type: ErrorType;
      level?: ErrorLevel;
      message: string;
      stack?: string;
      filename?: string;
      lineno?: number;
      colno?: number;

      // 上下文信息
      url: string;
      userAgent: string;
      timestamp: number;
      userId?: string;
      sessionId?: string;

      // Vue组件相关
      componentName?: string;
      componentStack?: string;
      propsData?: any;
      route?: string;
      routeParams?: any;
      routeQuery?: any;

      // 资源错误信息
      resourceType?: string;
      resourceUrl?: string;

      // 请求错误信息
      requestUrl?: string;
      requestMethod?: string;
      requestData?: any;
      responseStatus?: number;
      responseData?: any;

      // 自定义信息
      customData?: any;

      // 错误ID（用于去重）
      errorId?: string;

      // 数据库字段
      _id?: string;
      created_at?: string;
      updated_at?: string;
      __v?: number;
    }

    /** 错误列表查询参数 */
    interface ErrorSearchParams {
      /** 错误类型 */
      type?: ErrorType;
      /** 错误级别 */
      level?: ErrorLevel;
      /** 错误消息关键词 */
      message?: string;
      /** 用户ID */
      userId?: string;
      /** 会话ID */
      sessionId?: string;
      /** 开始时间戳 */
      startTime?: number;
      /** 结束时间戳 */
      endTime?: number;
      /** 当前页码 */
      pageNo: number;
      /** 页面大小 */
      pageSize: number;
    }

    /** 错误列表响应数据 */
    interface ErrorList {
      list: ErrorInfo[];
      total: number;
    }

    /** 错误统计信息 */
    interface ErrorStats {
      /** 总错误数 */
      total: number;
      /** 按类型统计 */
      byType: Record<ErrorType, number>;
      /** 按级别统计 */
      byLevel: Record<ErrorLevel, number>;
      /** 最近错误列表 */
      recent: ErrorInfo[];
    }

    /** 错误上报请求数据 */
    interface ErrorReportRequest {
      /** 错误信息 */
      errorInfo: ErrorInfo;
      /** 全局自定义数据 */
      customData?: any;
    }

    /** 后端接口错误数据格式（与 ErrorInfo 保持一致） */
    interface ErrorReportData extends ErrorInfo {
      // 继承 ErrorInfo 的所有字段
      // 如果需要额外的字段，可以在这里添加
    }

    /** 错误上报响应数据 */
    interface ErrorReportResponse {
      /** 是否成功 */
      success: boolean;
      /** 错误ID */
      errorId: string;
      /** 消息 */
      message?: string;
    }

    /** 批量错误上报请求数据 */
    interface BatchErrorReportRequest {
      /** 错误信息列表 */
      errors: ErrorInfo[];
      /** 全局自定义数据 */
      customData?: any;
    }

    /** 错误监控配置 */
    interface ErrorMonitorConfig {
      /** 是否启用控制台日志 */
      enableConsoleLog?: boolean;
      /** 是否启用上报 */
      enableReport?: boolean;
      /** 上报URL */
      reportUrl?: string;
      /** 自定义上报函数 */
      customReport?: (errorInfo: ErrorInfo) => void;
      /** 忽略的错误模式 */
      ignoreErrors?: (string | RegExp)[];
      /** 忽略的URL模式 */
      ignoreUrls?: (string | RegExp)[];
      /** 最大错误数量 */
      maxErrors?: number;
      /** 采样率 */
      sampleRate?: number;
      /** 用户ID */
      userId?: string;
      /** 会话ID */
      sessionId?: string;
      /** 自定义数据 */
      customData?: any;
      /** 错误级别配置 */
      levelConfig?: {
        [key in ErrorType]?: ErrorLevel;
      };
    }
  }

  /**
   * namespace Route
   *
   * backend api module: "route"
   */
  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;

    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }

    interface UserRoute {
      routes: MenuRoute[];
      home: import('@elegant-router/types').LastLevelRouteKey;
    }
  }

  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    /** role */
    type Role = Common.CommonRecord<{
      /** role name */
      roleName: string;
      /** role code */
      roleCode: string;
      /** role description */
      roleDesc: string;
    }>;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    /** all role */
    type AllRole = Pick<Role, 'id' | 'roleName' | 'roleCode'>;

    /**
     * user gender
     *
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '1' | '2';

    /** user */
    type User = Common.CommonRecord<{
      /** user name */
      userName: string;
      /** user gender */
      userGender: UserGender | undefined;
      /** user nick name */
      nickName: string;
      /** user phone */
      userPhone: string;
      /** user email */
      userEmail: string;
      /** user role code collection */
      userRoles: string[];
    }>;

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'userName' | 'userGender' | 'nickName' | 'userPhone' | 'userEmail' | 'status'> &
        CommonSearchParams
    >;

    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /**
     * menu type
     *
     * - "1": directory
     * - "2": menu
     */
    type MenuType = '1' | '2';

    type MenuButton = {
      /**
       * button code
       *
       * it can be used to control the button permission
       */
      code: string;
      /** button description */
      desc: string;
    };

    /**
     * icon type
     *
     * - "1": iconify icon
     * - "2": local icon
     */
    type IconType = '1' | '2';

    type MenuPropsOfRoute = Pick<
      import('vue-router').RouteMeta,
      | 'i18nKey'
      | 'keepAlive'
      | 'constant'
      | 'order'
      | 'href'
      | 'hideInMenu'
      | 'activeMenu'
      | 'multiTab'
      | 'fixedIndexInTab'
      | 'query'
    >;

    type Menu = Common.CommonRecord<{
      /** parent menu id */
      parentId: number;
      /** menu type */
      menuType: MenuType;
      /** menu name */
      menuName: string;
      /** route name */
      routeName: string;
      /** route path */
      routePath: string;
      /** component */
      component?: string;
      /** iconify icon name or local icon name */
      icon: string;
      /** icon type */
      iconType: IconType;
      /** buttons */
      buttons?: MenuButton[] | null;
      /** children menu */
      children?: Menu[] | null;
    }> &
      MenuPropsOfRoute;

    /** menu list */
    type MenuList = Common.PaginatingQueryRecord<Menu>;

    type MenuTree = {
      id: number;
      label: string;
      pId: number;
      children?: MenuTree[];
    };
  }
}
