'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/api';
import { meToAuthUser, updateStudentCredentialsApi } from '../../services/authService';
import { PasswordInput } from '../../components/ui/PasswordInput';

export function StudentAccountSettings() {
  const { authUser, syncAuthUser, showToast } = useApp();
  const [email, setEmail] = useState(authUser?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailChanged = email.trim().toLowerCase() !== authUser?.email.toLowerCase();
    const passwordChanged = newPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      showToast('Enter a new email or password to update your account.', 'warning');
      return;
    }
    if (passwordChanged && newPassword !== confirmPassword) {
      showToast('The new passwords do not match.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await updateStudentCredentialsApi({
        current_password: currentPassword,
        ...(emailChanged ? { email: email.trim() } : {}),
        ...(passwordChanged ? { new_password: newPassword } : {}),
      });
      syncAuthUser(meToAuthUser(updatedUser));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Your account credentials have been updated.', 'success');
    } catch (error) {
      showToast(
        error instanceof ApiError ? error.message : 'Could not update your account. Please try again.',
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-7">
      <div className="mb-6 flex items-start gap-3 border-b border-[var(--cg-border)] pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-primary-light)]">
          <ShieldCheck className="h-5 w-5 text-[var(--cg-primary)]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--cg-text)]">Account security</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--cg-text-muted)]">
            Change your sign-in email or password. Confirm your current password to save changes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-2">
          <span className="flex items-center gap-2 text-xs font-semibold text-[var(--cg-text)]">
            <Mail className="h-3.5 w-3.5 text-[var(--cg-text-muted)]" />
            Sign-in email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordInput
            id="student-new-password"
            label="New password"
            autoComplete="new-password"
            minLength={6}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            helperText="Leave blank if you are only changing your email."
          />
          <PasswordInput
            id="student-confirm-password"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <div className="border-t border-[var(--cg-border)] pt-5">
          <PasswordInput
            id="student-current-password"
            label="Current password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            helperText="Required to verify that it is you."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cg-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cg-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {isSaving ? 'Saving…' : 'Save account changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
