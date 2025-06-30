<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { fetchGetProductList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
const filterInput = ref('');
const element = ref<Element | null>(null);
const appStore = useAppStore();
const params = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 51
});
const gap = computed(() => (appStore.isMobile ? 0 : 16));

// const states = [
//   'Alabama',
//   'Alaska',
//   'Arizona',
//   'Arkansas',
//   'California',
//   'Colorado',
//   'Connecticut',
//   'Delaware',
//   'Florida',
//   'Georgia',
//   'Hawaii',
//   'Idaho',
//   'Illinois',
//   'Indiana',
//   'Iowa',
//   'Kansas',
//   'Kentucky',
//   'Louisiana',
//   'Maine',
//   'Maryland',
//   'Massachusetts',
//   'Michigan',
//   'Minnesota',
//   'Mississippi',
//   'Missouri',
//   'Montana',
//   'Nebraska',
//   'Nevada',
//   'New Hampshire',
//   'New Jersey',
//   'New Mexico',
//   'New York',
//   'North Carolina',
//   'North Dakota',
//   'Ohio',
//   'Oklahoma',
//   'Oregon',
//   'Pennsylvania',
//   'Rhode Island',
//   'South Carolina',
//   'South Dakota',
//   'Tennessee',
//   'Texas',
//   'Utah',
//   'Vermont',
//   'Virginia',
//   'Washington',
//   'West Virginia',
//   'Wisconsin',
//   'Wyoming'
// ];
// const list = states.map((item): ListItem => {
//   return { value: `value:${item}`, label: `label:${item}` };
// });
interface ListItem {
  value: number;
  label: string;
}
const value = ref([]);
const options = ref<ListItem[]>([]);
const loading = ref(false);

const getOptionData = async () => {
  // loading.value = true;
  await fetchGetProductList({ search: filterInput.value, pageNo: params.pageNo, pageSize: params.pageSize })
    .then(res => {
      console.log('res', res);
      const tempRes =
        res?.data?.products.map((item): ListItem => {
          return { value: item.product_id, label: item.product_name };
        }) ?? [];
      params.total = res?.data?.total ?? 0;
      options.value.push(...tempRes);
    })
    .finally(() => {
      // loading.value = false;
    });
};

const handleScroll = () => {
  if (element.value) {
    console.log(
      'loadMore判断依据,scrollHeight,scrollTop,clientHeight,阈值,total,pageNo,pageSize',
      element.value.scrollHeight,
      element.value.scrollTop,
      element.value.clientHeight,
      0,
      params.total,
      params.pageNo,
      params.pageSize
    );
    const loadMore =
      element.value.scrollHeight <= element.value.clientHeight + element.value.scrollTop + 0 &&
      params.total > params.pageNo * params.pageSize;
    console.log('加载更多 loadMore:', loadMore);
    if (loadMore) {
      params.pageNo += 1;
      getOptionData();
    }
  }
};

const handleFocus = () => {
  element.value = document.querySelector('.selectRef .el-select-dropdown__list');
  console.log('element.value', element.value);
  if (element.value) {
    element.value.addEventListener('scroll', handleScroll);
  }
};
const remoteMethod = async (query: string) => {
  console.log('query', query);
  filterInput.value = query;
  params.pageNo = 1;
  params.pageSize = 50;
  options.value.splice(0, options.value.length);
  getOptionData();
  setTimeout(() => {
    handleFocus();
  }, 2000);
  // const res = await fetchGetProductList({ pageNo: 1, pageSize: 10 });
  // console.log('res', res);

  // if (query !== '') {
  //   loading.value = true;
  //   setTimeout(() => {
  //     loading.value = false;
  //     options.value = list.filter(item => {
  //       return item.label.toLowerCase().includes(query.toLowerCase());
  //     });
  //   }, 200);
  // } else {
  //   options.value = [];
  // }
};
const debounceRemoteMethod = useDebounceFn(remoteMethod, 500);
</script>

<template>
  <ElCard class="card-wrapper">
    <ElRow :gutter="gap" class="px-8px">
      <ElCol :md="18" :sm="24">
        <div class="flex-col-top size-full min-h-420px gap-24px overflow-hidden">
          <!-- <div class="m-6 text-18px font-semibold">下拉框处理</div> -->
          <ElSelectV2
            v-model="value"
            popper-class="selectRef"
            class="m-6"
            :popper-append-to-body="false"
            multiple
            filterable
            remote
            collapse-tags
            :max-collapse-tags="3"
            :remote-method="debounceRemoteMethod"
            clearable
            :options="options"
            :loading="loading"
            placeholder="请输入关键字再选择"
            style="width: 240px"
            @focus="handleFocus"
          />
        </div>
      </ElCol>
    </ElRow>
  </ElCard>
</template>

<style scoped>
:deep(.el-card__body) {
  background-color: #ffffff;
}
</style>
