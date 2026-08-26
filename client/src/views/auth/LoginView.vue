<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
const route = useRoute();

const formError = ref('');
const mfaChallenge = ref(null);
const mfaCode = ref('');

const schema = yup.object({
  email: yup.string().required('Email is required').email('Enter a valid email'),
  password: yup.string().required('Password is required')
});

const { handleSubmit, isSubmitting } = useForm({ validationSchema: schema });
const { value: email, errorMessage: emailError } = useField('email');
const { value: password, errorMessage: passwordError } = useField('password');

function finish() {
  toast.success('Welcome back!');
  router.push(route.query.redirect || { name: 'dashboard' });
}

const onSubmit = handleSubmit(async (values) => {
  formError.value = '';
  try {
    const result = await auth.login(values);
    if (result?.mfaRequired) {
      mfaChallenge.value = result.mfaToken;
      return;
    }
    finish();
  } catch (error) {
    formError.value = error.message;
  }
});

async function onMfaSubmit() {
  if (!mfaCode.value || mfaCode.value.length !== 6) return;
  formError.value = '';
  try {
    await auth.completeMfaLogin(mfaChallenge.value, mfaCode.value);
    finish();
  } catch (error) {
    formError.value = error.message;
  }
}
</script>

<template>
  <AuthShell title="Sign in to your account">
    <template #subtitle>
      New here?
      <router-link to="/register" class="font-medium text-brand-600 hover:text-brand-500">Create an account</router-link>
    </template>

    <BaseAlert v-if="formError" tone="error" class="mb-4">{{ formError }}</BaseAlert>
    <BaseAlert v-if="route.query.session === 'expired'" tone="info" class="mb-4">
      Your session expired. Please sign in again.
    </BaseAlert>

    <form v-if="!mfaChallenge" class="space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseInput
        v-model="email"
        name="email"
        type="email"
        label="Email address"
        placeholder="you@company.com"
        autocomplete="email"
        required
        :error="emailError"
        data-testid="login-email"
      />
      <BaseInput
        v-model="password"
        name="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        autocomplete="current-password"
        required
        :error="passwordError"
        data-testid="login-password"
      />

      <div class="flex justify-end">
        <router-link to="/forgot-password" class="text-sm font-medium text-brand-600 hover:text-brand-500">
          Forgot your password?
        </router-link>
      </div>

      <BaseButton type="submit" block size="lg" :loading="isSubmitting" data-testid="login-submit">
        Sign in
      </BaseButton>
    </form>

    <form v-else class="space-y-4" @submit.prevent="onMfaSubmit">
      <p class="text-sm text-gray-600 dark:text-gray-400">Enter the 6-digit code from your authenticator app.</p>
      <input
        v-model="mfaCode"
        inputmode="numeric"
        maxlength="6"
        placeholder="000000"
        class="block w-full rounded-lg border-0 px-3 py-2 text-center font-mono text-xl tracking-[0.5em] shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700"
        data-testid="mfa-code-input"
      >
      <BaseButton type="submit" block size="lg" data-testid="mfa-verify-submit">Verify code</BaseButton>
      <button type="button" class="w-full text-center text-xs text-gray-400 hover:underline" @click="mfaChallenge = null">
        Back to sign in
      </button>
    </form>
  </AuthShell>
</template>
