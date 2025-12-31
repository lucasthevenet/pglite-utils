<template>
  <div>
    <form @submit="createDraft">
      <h1>Create Draft</h1>
      <input autoFocus placeholder="Title" type="text" v-model="title" />
      <textarea cols="50" placeholder="Content" rows="8" v-model="content" />
      <input
        :class="{'primary': title }"
        v-bind="{'disabled': !title }"
        type="submit"
        value="Create"
      />
      <NuxtLink class="back" to="/"> or Cancel </NuxtLink>
    </form>
  </div>
</template>
<script setup>
const router = useRouter();

const title = ref();
const content = ref();
const isLoading = ref(false);


const createDraft = async (e) => {
  e.preventDefault()
  const body = {
    title: title.value,
    content: content.value,
  }

  await fetch("/post", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  .then(()=>{
    router.push({ name: 'drafts' })
  })
  .catch((error)=>{
    console.error(error);
  })
}
</script>
<style scoped>
.page {
  background: white;
  padding: 3rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

input[type='text'],
textarea {
  width: 100%;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border-radius: 0.25rem;
  border: 0.125rem solid rgba(0, 0, 0, 0.2);
}

input[type='submit'] {
  background: #ececec;
  border: 0;
  padding: 1rem 2rem;
}

.back {
  margin-left: 1rem;
}

span {
  color: red;
}

.primary {
  background: blue !important;
  color: white;
}
</style>
