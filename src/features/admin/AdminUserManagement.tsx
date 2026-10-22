'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, UserRoundCog, UserRoundPlus, UserX } from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  createManagedUserApi,
  listManagedUsersApi,
  ManagedRole,
  ManagedUser,
  updateManagedUserApi,
} from '../../services/userService';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'GATE_OFFICER' as ManagedRole,
  phone: '',
  department: '',
  campus_id: '',
};

export function AdminUserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(initialForm);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listManagedUsersApi());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load managed accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setError(null);
  };

  const beginEdit = (user: ManagedUser) => {
    setEditing(user);
    setError(null);
    setForm({
      ...initialForm,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (editing) {
        const updates = {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        };
        await updateManagedUserApi(editing.id, updates);
        setNotice(`Updated ${form.full_name.trim()}'s account.`);
      } else {
        await createManagedUserApi({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          phone: form.phone.trim() || null,
          department: form.department.trim() || null,
          campus_id: form.campus_id.trim() || null,
        });
        setNotice(`Created ${form.role === 'ADMIN' ? 'administrator' : 'gate officer'} account.`);
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActiveChange = async (user: ManagedUser) => {
    if (
      user.is_active
      && !window.confirm(`Deactivate ${user.full_name}? They will no longer be able to sign in. Their history will be retained.`)
    ) return;

    setError(null);
    setNotice(null);
    try {
      const updated = await updateManagedUserApi(user.id, { is_active: !user.is_active });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`${user.full_name}'s account is now ${updated.is_active ? 'active' : 'deactivated'}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update account status.');
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-5 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-primary-light)] text-[var(--cg-primary)]">
            {editing ? <Pencil className="h-5 w-5" /> : <UserRoundPlus className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--cg-text)]">
              {editing ? 'Update managed account' : 'Add an administrator or gate officer'}
            </h2>
            <p className="mt-1 text-sm text-[var(--cg-text-muted)]">
              {editing
                ? 'Update account details or set a new password. Leave the password blank to keep it unchanged.'
                : 'Create a privileged account. Use a unique email and a strong password of at least 16 characters.'}
            </p>
          </div>
        </div>

        {error && <div role="alert" className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3 text-sm text-[var(--cg-danger)]">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] p-3 text-sm text-[var(--cg-success)]">{notice}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="managed-user-name" className="block text-xs font-semibold text-[var(--cg-text)]">Full name <span className="text-[var(--cg-danger)]">*</span></label>
            <input id="managed-user-name" required maxLength={255} autoComplete="name" value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
          </div>
          <div className="space-y-2">
            <label htmlFor="managed-user-email" className="block text-xs font-semibold text-[var(--cg-text)]">Email <span className="text-[var(--cg-danger)]">*</span></label>
            <input id="managed-user-email" required type="email" autoComplete="email" maxLength={255} value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
          </div>
          <div className="space-y-2">
            <label htmlFor="managed-user-role" className="block text-xs font-semibold text-[var(--cg-text)]">Account role <span className="text-[var(--cg-danger)]">*</span></label>
            <select id="managed-user-role" value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as ManagedRole }))}
              className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10">
              <option value="GATE_OFFICER">Gate Officer</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          {!editing && (
            <>
              <div className="space-y-2">
                <label htmlFor="managed-user-phone" className="block text-xs font-semibold text-[var(--cg-text)]">Phone <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span></label>
                <input id="managed-user-phone" type="tel" autoComplete="tel" maxLength={50} value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="space-y-2">
                <label htmlFor="managed-user-department" className="block text-xs font-semibold text-[var(--cg-text)]">Department <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span></label>
                <input id="managed-user-department" maxLength={255} value={form.department}
                  onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="space-y-2">
                <label htmlFor="managed-user-campus-id" className="block text-xs font-semibold text-[var(--cg-text)]">Campus ID <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span></label>
                <input id="managed-user-campus-id" maxLength={50} value={form.campus_id}
                  onChange={(event) => setForm((current) => ({ ...current, campus_id: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label htmlFor="managed-user-password" className="block text-xs font-semibold text-[var(--cg-text)]">
              {editing ? 'Reset password' : 'Temporary password'} <span className="text-[var(--cg-danger)]">{editing ? '' : '*'}</span>
            </label>
            <input id="managed-user-password" required={!editing} minLength={16} maxLength={72} type="password" autoComplete="new-password"
              value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={editing ? 'Leave blank to keep current password' : 'At least 16 characters'}
              className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
          </div>
          <div className="flex flex-wrap items-end justify-end gap-2 sm:col-span-2 xl:col-span-3">
            {editing && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
            <Button type="submit" disabled={submitting} icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <KeyRound className="h-4 w-4" /> : <Plus className="h-4 w-4" />} centeredLabel className="w-full sm:w-auto sm:min-w-48">
              {submitting ? 'Saving account…' : editing ? 'Save changes' : 'Create account'}
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-sm)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--cg-border)] p-5">
          <div>
            <h2 className="text-base font-bold text-[var(--cg-text)]">Administrators and gate officers</h2>
            <p className="mt-1 text-sm text-[var(--cg-text-muted)]">Deactivated accounts retain their history and can be reactivated.</p>
          </div>
          <button type="button" onClick={() => void loadUsers()} disabled={loading} aria-label="Refresh managed accounts" title="Refresh"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--cg-border)] text-[var(--cg-text-muted)] transition-colors hover:bg-[var(--cg-surface-muted)] disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--cg-primary)]" /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No managed accounts found" />
        ) : (
          <div className="divide-y divide-[var(--cg-border)]">
            {users.map((user) => (
              <article key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${user.role === 'ADMIN' ? 'bg-[var(--cg-primary-light)] text-[var(--cg-primary)]' : 'bg-[var(--cg-success-bg)] text-[var(--cg-success)]'}`}>
                    {user.role === 'ADMIN' ? <ShieldCheck className="h-5 w-5" /> : <UserRoundCog className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-[var(--cg-text)]">{user.full_name}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${user.is_active ? 'border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] text-[var(--cg-success)]' : 'border-[var(--cg-border)] bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)]'}`}>
                        {user.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-sm text-[var(--cg-text-muted)]">{user.email}</p>
                    <p className="mt-1 text-xs text-[var(--cg-text-subtle)]">
                      {user.role === 'ADMIN' ? 'Administrator' : 'Gate Officer'}
                      {user.campus_id ? ` · ${user.campus_id}` : ''}
                      {user.department ? ` · ${user.department}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button type="button" variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} centeredLabel onClick={() => beginEdit(user)}>
                    Edit
                  </Button>
                  <Button type="button" variant={user.is_active ? 'danger' : 'secondary'} size="sm"
                    icon={user.is_active ? <UserX className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    centeredLabel onClick={() => void handleActiveChange(user)}>
                    {user.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
