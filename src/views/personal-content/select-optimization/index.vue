<script lang="ts" setup>
import { ref } from 'vue';
// import { fetchGetProductList } from '@/service/api';

const states = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming'
];
const list = states.map((item): ListItem => {
  return { value: `value:${item}`, label: `label:${item}` };
});

interface ListItem {
  value: string;
  label: string;
}

const value = ref([]);
const options = ref<ListItem[]>([]);
const loading = ref(false);

// async function getUserInfo() {
//   const { data: info, error } = await fetchGetProductList();

//   if (!error) {
//     // update store
//     Object.assign(userInfo, info);

//     return true;
//   }

//   return false;
// }

const remoteMethod = (query: string) => {
  // const res = await fetchGetProductList({ pageNo: 1, pageSize: 10 });
  // console.log(res);

  if (query !== '') {
    loading.value = true;
    setTimeout(() => {
      loading.value = false;
      options.value = list.filter(item => {
        return item.label.toLowerCase().includes(query.toLowerCase());
      });
    }, 200);
  } else {
    options.value = [];
  }
};
</script>

<template>
  <div class="flex-col-top size-full min-h-420px gap-24px overflow-hidden">
    <!-- <div class="m-6 text-18px font-semibold">下拉框处理</div> -->
    <ElSelectV2
      v-model="value"
      class="m-6"
      style="width: 240px"
      multiple
      filterable
      remote
      :remote-method="remoteMethod"
      clearable
      :options="options"
      :loading="loading"
      placeholder="Please enter a keyword"
    />
  </div>
</template>

<style scoped></style>
