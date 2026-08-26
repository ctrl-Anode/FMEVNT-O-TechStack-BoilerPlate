<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';
import AuthShell from '@/components/layout/AuthShell.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();

const formError = ref('');

const schema = yup.object({
  firstName: yup.string().required('First name is required').min(2, 'Too short'),
  lastName: yup.string().required('Last name is required').min(2, 'Too short'),
  email: yup.string().required('Email is required').email('Enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(10, 'At least 10 characters')
    .matches(/[A-Za-z]/, 'Must contain a letter')
    .matches(/[0-9]/, 'Must contain a number')
});

const { handleSubmit, isSubmitting } = useForm({ validationSchema: schema });
const { value: firstName, errorMessage: firstNameError } = useField('firstName');
const { value: lastName, errorMessage: lastNameError } = useField('lastName');
const { value: email, errorMessage: emailError } = useField('email');
const { value: password, errorMessage: passwordError } = useField('password');

const onSubmit = handleSubmit(async (values) => {
  formError.value = '';
  try {
    await auth.register(values);
    toast.success('Account created', 'Welcome to the platform!');
    router.push({ name: 'dashboard' });
  } catch (error) {
    formError.value = error.details ? Object.values(error.details)[0] : error.message;
  }
});
</script>

<template>
  <AuthShell title="Create your account">
    <template #subtitle>
      Already have an account?
      <router-link to="/login" class="font-medium text-brand-600 hover:text-brand-500">Sign in</router-link>
    </template>

    <BaseAlert v-if="formError" tone="error" class="mb-4">{{ formError }}</BaseAlert>

    <form class="space-y-4" novalidate @submit.prevent="onSubmit">
      <div class="grid grid-cols-2 gap-3">
        <BaseInput v-model="firstName" name="firstName" label="First name" required :error="firstNameError" data-testid="register-first-name" />
        <BaseInput v-model="lastName" name="lastName" label="Last name" required :error="lastNameError" data-testid="register-last-name" />
      </div>
      <BaseInput v-model="email" name="email" type="email" label="Email address" placeholder="you@company.com" autocomplete="email" required :error="emailError" data-testid="register-email" />
      <BaseInput v-model="password" name="password" type="password" label="Password" hint="Minimum 10 characters with letters and numbers" autocomplete="new-password" required :error="passwordError" data-testid="register-password" />

      <BaseButton type="submit" block size="lg" :loading="isSubmitting" data-testid="register-submit">
        Create account
      </BaseButton>
    </form>
  </AuthShell>
</template>
