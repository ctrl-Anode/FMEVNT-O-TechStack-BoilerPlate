<script setup>
import { ref } from 'vue';
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';
import AuthShell from '@/components/layout/AuthShell.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import { authApi } from '@/api/auth';

const sent = ref(false);
const formError = ref('');

const schema = yup.object({
  email: yup.string().required('Email is required').email('Enter a valid email')
});

const { handleSubmit, isSubmitting } = useForm({ validationSchema: schema });
const { value: email, errorMessage: emailError } = useField('email');

const onSubmit = handleSubmit(async (values) => {
  formError.value = '';
  try {
    await authApi.forgotPassword(values.email);
    sent.value = true;
  } catch (error) {
    formError.value = error.message;
  }
});
</script>

<template>
  <AuthShell title="Reset your password">
    <template #subtitle>
      Remembered it?
      <router-link to="/login" class="font-medium text-brand-600 hover:text-brand-500">Sign in</router-link>
    </template>

    <BaseAlert v-if="sent" tone="success" title="Check your inbox">
      If an account exists for that address, a reset link is on its way. It expires in 30 minutes.
    </BaseAlert>

    <form v-else class="space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseAlert v-if="formError" tone="error">{{ formError }}</BaseAlert>
      <BaseInput v-model="email" name="email" type="email" label="Email address" required :error="emailError" />
      <BaseButton type="submit" block size="lg" :loading="isSubmitting">Send reset link</BaseButton>
    </form>
  </AuthShell>
</template>
