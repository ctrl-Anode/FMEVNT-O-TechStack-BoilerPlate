<script setup>
import { ref, computed } from 'vue';
import { useForm, useField } from 'vee-validate';
import * as yup from 'yup';
import vueFilePond from 'vue-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';

import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import PageHeader from '@/components/ui/PageHeader.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import { usersApi, uploadsApi } from '@/api';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const FilePond = vueFilePond(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize
);

const auth = useAuthStore();
const toast = useToastStore();

const activeTab = ref('profile');
const uploading = ref(false);
const savingProfile = ref(false);

const initials = computed(() => {
  const user = auth.user;
  return user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';
});

async function handleAvatarUpload(error, fileItem) {
  if (error || !fileItem) return;
  uploading.value = true;
  try {
    await uploadsApi.uploadAvatar(fileItem.file);
    await auth.refreshUser();
    toast.success('Avatar updated');
  } catch (err) {
    toast.error('Upload failed', err.message);
  } finally {
    fileItem.abort?.();
    uploading.value = false;
  }
}

const profileSchema = yup.object({
  firstName: yup.string().required('Required').min(2),
  lastName: yup.string().required('Required').min(2)
});
const { handleSubmit: handleProfileSubmit } = useForm({
  validationSchema: profileSchema,
  initialValues: { firstName: auth.user?.firstName, lastName: auth.user?.lastName }
});
const { value: firstName } = useField('firstName');
const { value: lastName } = useField('lastName');

const saveProfile = handleProfileSubmit(async (values) => {
  savingProfile.value = true;
  try {
    await usersApi.updateProfile(values);
    await auth.refreshUser();
    toast.success('Profile saved');
  } catch (error) {
    toast.error('Save failed', error.message);
  } finally {
    savingProfile.value = false;
  }
});

const passwordFormError = ref('');
const passwordChanged = ref(false);
const passwordSchema = yup.object({
  currentPassword: yup.string().required('Required'),
  newPassword: yup.string().required('Required').min(10).matches(/[A-Za-z]/).matches(/[0-9]/)
});
const { handleSubmit: handlePasswordSubmit, isSubmitting: changingPassword } = useForm({
  validationSchema: passwordSchema
});
const { value: currentPassword } = useField('currentPassword');
const { value: newPassword } = useField('newPassword');

const savePassword = handlePasswordSubmit(async (values) => {
  passwordFormError.value = '';
  try {
    await authApi.changePassword(values);
    passwordChanged.value = true;
    toast.success('Password changed', 'Other sessions were signed out.');
  } catch (error) {
    passwordFormError.value = error.message;
  }
});

const mfaSetup = ref(null);
const mfaCode = ref('');
const mfaDisable = ref({ password: '', code: '' });
const mfaBusy = ref(false);

async function startMfaSetup() {
  mfaBusy.value = true;
  try {
    mfaSetup.value = await authApi.setupMfa();
  } catch (error) {
    toast.error('MFA setup failed', error.message);
  } finally {
    mfaBusy.value = false;
  }
}

async function confirmMfa() {
  mfaBusy.value = true;
  try {
    await authApi.confirmMfa(mfaCode.value);
    await auth.refreshUser();
    mfaSetup.value = null;
    mfaCode.value = '';
    toast.success('Two-factor authentication enabled');
  } catch (error) {
    toast.error('Invalid code', error.message);
  } finally {
    mfaBusy.value = false;
  }
}

async function disableMfa() {
  mfaBusy.value = true;
  try {
    await authApi.disableMfa(mfaDisable.value);
    await auth.refreshUser();
    mfaDisable.value = { password: '', code: '' };
    toast.success('Two-factor authentication disabled');
  } catch (error) {
    toast.error('Could not disable MFA', error.message);
  } finally {
    mfaBusy.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="Profile & Security" subtitle="Manage your account details, password and two-factor authentication" />

    <div class="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 w-fit">
      <button
        v-for="tab in ['profile', 'security']"
        :key="tab"
        type="button"
        class="rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors"
        :class="activeTab === tab ? 'bg-white shadow-sm dark:bg-gray-900' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <div v-if="activeTab === 'profile'" class="grid gap-5 lg:grid-cols-3">
      <BaseCard title="Avatar" class="lg:col-span-1">
        <div class="flex flex-col items-center gap-4">
          <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="" class="h-24 w-24 rounded-full object-cover ring-4 ring-brand-100 dark:ring-brand-500/20">
          <span v-else class="flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">{{ initials }}</span>

          <FilePond
            class-name="w-full"
            label-idle="Drop an image or <span class=&quot;filepond--label-action&quot;>browse</span>"
            accepted-file-types="image/jpeg, image/png, image/webp"
            max-file-size="5MB"
            credits="false"
            :instant-upload="false"
            :allow-multiple="false"
            @addfile="handleAvatarUpload"
          />
          <p v-if="uploading" class="text-xs text-gray-400">Uploading...</p>
        </div>
      </BaseCard>

      <BaseCard title="Personal information" class="lg:col-span-2">
        <form class="max-w-md space-y-4" novalidate @submit.prevent="saveProfile">
          <BaseInput v-model="firstName" name="firstName" label="First name" required />
          <BaseInput v-model="lastName" name="lastName" label="Last name" required />
          <BaseInput :model-value="auth.user?.email" name="emailReadonly" label="Email address" hint="Contact an administrator to change your email" disabled />
          <div class="flex items-center gap-2 pt-2">
            <BaseBadge v-for="role in auth.user?.roles || []" :key="role.id" tone="brand">{{ role.name }}</BaseBadge>
          </div>
          <BaseButton type="submit" :loading="savingProfile">Save changes</BaseButton>
        </form>
      </BaseCard>
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-2">
      <BaseCard title="Change password">
        <BaseAlert v-if="passwordChanged" tone="success" class="mb-4">Password updated successfully.</BaseAlert>
        <form class="space-y-4" novalidate @submit.prevent="savePassword">
          <BaseAlert v-if="passwordFormError" tone="error">{{ passwordFormError }}</BaseAlert>
          <BaseInput v-model="currentPassword" name="currentPassword" type="password" label="Current password" required autocomplete="current-password" />
          <BaseInput v-model="newPassword" name="newPassword" type="password" label="New password" hint="Minimum 10 characters with letters and numbers" required autocomplete="new-password" />
          <BaseButton type="submit" :loading="changingPassword">Update password</BaseButton>
        </form>
      </BaseCard>

      <BaseCard title="Two-factor authentication">
        <template v-if="!auth.user?.mfaEnabled && !mfaSetup">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add an extra layer of security by requiring a time-based one-time code (TOTP) at every sign-in.
          </p>
          <BaseButton :loading="mfaBusy" @click="startMfaSetup()">Enable 2FA</BaseButton>
        </template>

        <template v-else-if="mfaSetup">
          <BaseAlert tone="info" class="mb-4">
            1. Add this secret to your authenticator app (Google Authenticator, 1Password, Authy...).
          </BaseAlert>
          <p class="break-all rounded-lg bg-gray-100 p-3 font-mono text-sm dark:bg-gray-800">{{ mfaSetup.secret }}</p>
          <p class="mt-2 break-all text-xs text-gray-400">{{ mfaSetup.otpauth }}</p>

          <div class="mt-4 flex gap-2">
            <input
              v-model="mfaCode"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              class="block w-32 rounded-lg border-0 px-3 py-2 text-center font-mono shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand-600 dark:bg-gray-800 dark:ring-gray-700"
            >
            <BaseButton :loading="mfaBusy" :disabled="mfaCode.length !== 6" @click="confirmMfa()">Confirm & activate</BaseButton>
            <BaseButton variant="secondary" @click="mfaSetup = null">Cancel</BaseButton>
          </div>
        </template>

        <template v-else>
          <BaseAlert tone="success" title="2FA is active" class="mb-4">
            You will be asked for a TOTP code each time you sign in.
          </BaseAlert>
          <div class="space-y-3 max-w-sm">
            <BaseInput v-model="mfaDisable.password" name="mfa-disable-password" type="password" label="Confirm your password" required autocomplete="current-password" />
            <BaseInput v-model="mfaDisable.code" name="mfa-disable-code" label="Current 6-digit code" placeholder="000000" required />
            <BaseButton variant="danger" :loading="mfaBusy" @click="disableMfa()">Disable 2FA</BaseButton>
          </div>
        </template>
      </BaseCard>
    </div>
  </div>
</template>
