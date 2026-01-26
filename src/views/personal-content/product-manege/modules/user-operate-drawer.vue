<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { productCategoryOptions } from '@/constants/business';
import { fetchCreateProduct, fetchUpdateProduct } from '@/service/api';
import { useForm, useFormRules } from '@/hooks/common/form';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';

defineOptions({ name: 'ProductOperateDrawer' });

interface Props {
  /** the type of operation */
  operateType: UI.TableOperateType;
  /** the edit row data */
  rowData?: Api.productsList.Product | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<UI.TableOperateType, string> = {
    add: $t('page.personalContent.productManege.addProduct'),
    edit: $t('page.personalContent.productManege.editProduct')
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.productsList.Product,
  'product_id' | 'product_name' | 'category' | 'price' | 'stock' | 'description'
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    product_id: 0,
    product_name: '',
    category: '',
    price: 0,
    stock: 0,
    description: ''
  };
}

type RuleKey = Extract<keyof Model, 'product_name'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  product_name: defaultRequiredRule
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, {
      product_id: props.rowData.product_id,
      product_name: props.rowData.product_name,
      category: props.rowData.category,
      price: props.rowData.price,
      stock: props.rowData.stock,
      description: props.rowData.description || ''
    });
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  try {
    if (props.operateType === 'add') {
      await fetchCreateProduct(model.value);
      window.$message?.success($t('common.addSuccess'));
    } else if (props.operateType === 'edit' && props.rowData) {
      // eslint-disable-next-line no-underscore-dangle
      await fetchUpdateProduct(props.rowData._id, model.value);
      window.$message?.success($t('common.updateSuccess'));
    }

    closeDrawer();
    emit('submitted');
  } catch (error) {
    window.$message?.error('操作失败，请重试');
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <ElDrawer v-model="visible" :title="title" :size="360">
    <ElForm ref="formRef" :model="model" :rules="rules" label-position="top">
      <ElFormItem :label="$t('page.personalContent.productManege.product_id')" prop="product_id">
        <ElInputNumber
          v-model="model.product_id"
          :placeholder="$t('page.personalContent.productManege.form.product_id')"
          class="w-full"
          :min="0"
          :disabled="operateType === 'edit'"
        />
      </ElFormItem>
      <ElFormItem :label="$t('page.personalContent.productManege.product_name')" prop="product_name">
        <ElInput
          v-model="model.product_name"
          :placeholder="$t('page.personalContent.productManege.form.product_name')"
        />
      </ElFormItem>
      <ElFormItem :label="$t('page.personalContent.productManege.category')" prop="category">
        <ElSelect
          v-model="model.category"
          clearable
          :placeholder="$t('page.personalContent.productManege.form.category')"
          class="w-full"
        >
          <ElOption
            v-for="item in translateOptions(productCategoryOptions)"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem :label="$t('page.personalContent.productManege.price')" prop="price">
        <ElInputNumber
          v-model="model.price"
          :placeholder="$t('page.personalContent.productManege.form.price')"
          class="w-full"
          :min="0"
          :precision="2"
        />
      </ElFormItem>
      <ElFormItem :label="$t('page.personalContent.productManege.stock')" prop="stock">
        <ElInputNumber
          v-model="model.stock"
          :placeholder="$t('page.personalContent.productManege.form.stock')"
          class="w-full"
          :min="0"
        />
      </ElFormItem>
      <ElFormItem label="描述" prop="description">
        <ElInput v-model="model.description" type="textarea" :rows="3" placeholder="请输入产品描述" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElSpace :size="16">
        <ElButton @click="closeDrawer">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</ElButton>
      </ElSpace>
    </template>
  </ElDrawer>
</template>

<style scoped></style>
