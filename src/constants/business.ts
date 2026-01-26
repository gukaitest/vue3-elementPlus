import { transformRecordToOption } from '@/utils/common';

export const enableStatusRecord: Record<Api.Common.EnableStatus, App.I18n.I18nKey> = {
  '1': 'page.manage.common.status.enable',
  '2': 'page.manage.common.status.disable'
};

export const enableStatusOptions = transformRecordToOption(enableStatusRecord);

export const userGenderRecord: Record<Api.SystemManage.UserGender, App.I18n.I18nKey> = {
  '1': 'page.manage.user.gender.male',
  '2': 'page.manage.user.gender.female'
};

export const userGenderOptions = transformRecordToOption(userGenderRecord);

export const menuTypeRecord: Record<Api.SystemManage.MenuType, App.I18n.I18nKey> = {
  '1': 'page.manage.menu.type.directory',
  '2': 'page.manage.menu.type.menu'
};

export const menuTypeOptions = transformRecordToOption(menuTypeRecord);

export const menuIconTypeRecord: Record<Api.SystemManage.IconType, App.I18n.I18nKey> = {
  '1': 'page.manage.menu.iconType.iconify',
  '2': 'page.manage.menu.iconType.local'
};

export const menuIconTypeOptions = transformRecordToOption(menuIconTypeRecord);

/** product category record */
export const productCategoryRecord: Record<
  | '宠物用品'
  | '数码配件'
  | '乐器'
  | '电脑'
  | '体育用品'
  | '母婴用品'
  | '手机'
  | '家电'
  | '家居用品'
  | '书籍'
  | '户外运动装备'
  | '美妆护肤'
  | '办公用品'
  | '服装'
  | '鞋履'
  | '厨卫用具'
  | '床上用品'
  | '玩具'
  | '箱包'
  | '食品饮料',
  App.I18n.I18nKey
> = {
  宠物用品: 'page.personalContent.productManege.categoryOptions.宠物用品',
  数码配件: 'page.personalContent.productManege.categoryOptions.数码配件',
  乐器: 'page.personalContent.productManege.categoryOptions.乐器',
  电脑: 'page.personalContent.productManege.categoryOptions.电脑',
  体育用品: 'page.personalContent.productManege.categoryOptions.体育用品',
  母婴用品: 'page.personalContent.productManege.categoryOptions.母婴用品',
  手机: 'page.personalContent.productManege.categoryOptions.手机',
  家电: 'page.personalContent.productManege.categoryOptions.家电',
  家居用品: 'page.personalContent.productManege.categoryOptions.家居用品',
  书籍: 'page.personalContent.productManege.categoryOptions.书籍',
  户外运动装备: 'page.personalContent.productManege.categoryOptions.户外运动装备',
  美妆护肤: 'page.personalContent.productManege.categoryOptions.美妆护肤',
  办公用品: 'page.personalContent.productManege.categoryOptions.办公用品',
  服装: 'page.personalContent.productManege.categoryOptions.服装',
  鞋履: 'page.personalContent.productManege.categoryOptions.鞋履',
  厨卫用具: 'page.personalContent.productManege.categoryOptions.厨卫用具',
  床上用品: 'page.personalContent.productManege.categoryOptions.床上用品',
  玩具: 'page.personalContent.productManege.categoryOptions.玩具',
  箱包: 'page.personalContent.productManege.categoryOptions.箱包',
  食品饮料: 'page.personalContent.productManege.categoryOptions.食品饮料'
};

export const productCategoryOptions = transformRecordToOption(productCategoryRecord);
