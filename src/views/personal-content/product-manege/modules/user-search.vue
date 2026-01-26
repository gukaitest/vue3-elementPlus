<script setup lang="ts">
import { computed } from 'vue';
import { productCategoryOptions } from '@/constants/business';
import { useForm } from '@/hooks/common/form';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';

defineOptions({ name: 'ProductSearch' });

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useForm();

const model = defineModel<Api.productsList.ProductSearchParams>('model', { required: true });

const rules = computed(() => ({}));

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <ElCard class="card-wrapper">
    <ElCollapse>
      <ElCollapseItem :title="$t('common.search')" name="product-search">
        <ElForm ref="formRef" :model="model" :rules="rules" label-position="right" :label-width="80">
          <ElRow :gutter="24">
            <ElCol :lg="6" :md="8" :sm="12">
              <ElFormItem :label="$t('page.personalContent.productManege.product_id')" prop="product_id">
                <ElInput
                  v-model="model.product_id"
                  :placeholder="$t('page.personalContent.productManege.form.product_id')"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :lg="6" :md="8" :sm="12">
              <ElFormItem :label="$t('page.personalContent.productManege.product_name')" prop="product_name">
                <ElInput
                  v-model="model.product_name"
                  :placeholder="$t('page.personalContent.productManege.form.product_name')"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :lg="6" :md="8" :sm="12">
              <ElFormItem :label="$t('page.personalContent.productManege.category')" prop="category">
                <ElSelect
                  v-model="model.category"
                  clearable
                  :placeholder="$t('page.personalContent.productManege.form.category')"
                >
                  <ElOption
                    v-for="item in translateOptions(productCategoryOptions)"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></ElOption>
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :lg="6" :md="8" :sm="12">
              <ElFormItem :label="$t('page.personalContent.productManege.price')" prop="price">
                <ElInput v-model="model.price" :placeholder="$t('page.personalContent.productManege.form.price')" />
              </ElFormItem>
            </ElCol>
            <ElCol :lg="6" :md="8" :sm="12">
              <ElFormItem :label="$t('page.personalContent.productManege.stock')" prop="stock">
                <ElInput v-model="model.stock" :placeholder="$t('page.personalContent.productManege.form.stock')" />
              </ElFormItem>
            </ElCol>
            <ElCol :lg="6" :md="8" :sm="12"></ElCol>
            <ElCol :lg="12" :md="24" :sm="24">
              <ElSpace class="w-full justify-end" alignment="end">
                <ElButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </ElButton>
                <ElButton type="primary" plain @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
                  </template>
                  {{ $t('common.search') }}
                </ElButton>
              </ElSpace>
            </ElCol>
          </ElRow>
        </ElForm>
      </ElCollapseItem>
    </ElCollapse>
  </ElCard>
</template>

<style scoped></style>
