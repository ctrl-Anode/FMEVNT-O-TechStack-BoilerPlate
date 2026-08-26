<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';
import AuthShell from '@/components/layout/AuthShell.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import { authApi } from '@/api/auth';
import { useToastStore } from '@/stores/toast';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const done = ref(false);
const formError = ref('');

const schema = yup.object({
  password: yup
    .string()
    .required('Password is required')
    .min(10, 'At least 10 characters')
    .matches(/[A-Za-z]/, 'Must contain a letter')
    .matches(/[0-9]/, 'Must contain a number'),
  confirmPassword: yup
    .string()
    .required('Confirm the password')
    .oneOf([yup.ref('password')], 'Passwords must match')
});

const { handleSubmit, isSubmitting } = useForm({ validationSchema: schema });
const { value: password, errorMessage: passwordError } = useField('password');
const { value: confirmPassword, errorMessage: confirmError } = useField('confirmPassword');

const onSubmit = handleSubmit(async (values) => {
  formError.value = '';
  try {
    await authApi.resetPassword({ token: String(route.query.token || ''), password: values.password });
    done.value = true;
    toast.success('Password updated', 'Sign in with your new password.');
    setTimeout(() => router.push('/login'), 1500);
  } catch (error) {
    formError.value = error.message;
  }
});
</script>

<template>
  <AuthShell title="Choose a new password">
    <BaseAlert v-if="done" tone="success" title="All set!">Redirecting you to sign in...</BaseAlert>

    <form v-else class="space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseAlert v-if="formError" tone="error">{{ formError }}</BaseAlert>
      <BaseAlert v-if="!route.query.token" tone="warning">
        This link is missing its token. Request a fresh one from the forgot-password page.
      </BaseAlert>

      <BaseInput v-model="password" name="password" type="password" label="New password" required :error="passwordError" autocomplete="new-password" />
      <BaseInput v-model="confirmPassword" name="confirmPassword" type="password" label="Confirm new password" required :error="confirmError" autocomplete="new-password" />

      <BaseButton type="submit" block size="lg" :loading="isSubmitting">Update password</BaseButton>
    </form>
  </AuthShell>
</template>
