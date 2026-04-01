'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  SearchIcon,
  PencilIcon,
  Loader2Icon,
  UsersIcon,
  ShieldIcon,
  PlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRole } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  department: string | null;
  jobGrade: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/20',
  charge_manager: 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border-[var(--accent-teal)]/20',
  pmo: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  finance: 'bg-[var(--accent-green-light)] text-[var(--accent-green)] border-[var(--accent-green)]/20',
  employee: 'bg-stone-100 text-[var(--text-secondary)] border-stone-200 dark:bg-stone-800 dark:border-stone-700',
};

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'charge_manager', label: 'Charge Manager' },
  { value: 'pmo', label: 'PMO' },
  { value: 'finance', label: 'Finance' },
  { value: 'employee', label: 'Employee' },
];


export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editJobGrade, setEditJobGrade] = useState('');
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addFullName, setAddFullName] = useState('');
  const [addRole, setAddRole] = useState('employee');
  const [addDepartment, setAddDepartment] = useState('');
  const [addJobGrade, setAddJobGrade] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users'),
  });

  const filtered = users.filter((user) => {
    const matchesSearch =
      !search ||
      (user.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.department || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  function openEditUser(user: User) {
    setEditingUser(user);
    setEditRole(user.role);
    setEditJobGrade(user.jobGrade || '');
    setEditDialogOpen(true);
  }

  async function handleSaveUser() {
    if (!editingUser) return;
    setSaving(true);
    try {
      if (editRole !== editingUser.role) {
        await api.put(`/users/${editingUser.id}/role`, { role: editRole });
      }
      if (editJobGrade !== (editingUser.jobGrade || '')) {
        await api.put(`/users/${editingUser.id}/job-grade`, { jobGrade: editJobGrade });
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditDialogOpen(false);
    } catch (e) {
      console.error('Failed to update user:', e);
    } finally {
      setSaving(false);
    }
  }

  function openAddDialog() {
    setAddEmail('');
    setAddFullName('');
    setAddRole('employee');
    setAddDepartment('');
    setAddJobGrade('');
    setAddDialogOpen(true);
  }

  async function handleAddUser() {
    if (!addEmail.trim() || !addFullName.trim()) return;
    setAddSaving(true);
    try {
      await api.post('/users', {
        email: addEmail.trim(),
        fullName: addFullName.trim(),
        role: addRole,
        department: addDepartment.trim() || undefined,
        jobGrade: addJobGrade.trim() || undefined,
      });
      toast.success('User invited successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAddDialogOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to add user';
      toast.error(message);
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total users"
          value={users.length}
          icon={UsersIcon}
          accent="var(--accent-teal)"
        />
        <StatCard
          label="Admins"
          value={roleCounts['admin'] || 0}
          icon={ShieldIcon}
          accent="var(--accent-purple)"
        />
      </div>

      {/* User table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <PlusIcon className="w-4 h-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No users found"
              description="No users match your current search or filter criteria"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Job Grade</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      {user.fullName || '-'}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ROLE_COLORS[user.role] || ''}
                      >
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                      {user.jobGrade || '-'}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {user.department || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEditUser(user)}>
                        <PencilIcon className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Result count */}
          {!isLoading && (
            <p className="text-xs text-[var(--text-muted)] pt-1">
              Showing {filtered.length} of {users.length} users
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                placeholder="e.g., John Smith"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Role</label>
              <Select value={addRole} onValueChange={(v) => v && setAddRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter((r) => r.value !== 'all').map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Department</label>
              <Input
                value={addDepartment}
                onChange={(e) => setAddDepartment(e.target.value)}
                placeholder="e.g., Engineering"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Job Grade</label>
              <Input
                value={addJobGrade}
                onChange={(e) => setAddJobGrade(e.target.value)}
                placeholder="e.g., L3"
                className="font-[family-name:var(--font-mono)]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleAddUser}
              disabled={addSaving || !addEmail.trim() || !addFullName.trim()}
            >
              {addSaving && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Name
                  <span className="text-[var(--text-muted)] text-xs ml-2">(read-only)</span>
                </label>
                <Input value={editingUser.fullName || ''} disabled className="opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Email
                  <span className="text-[var(--text-muted)] text-xs ml-2">(read-only)</span>
                </label>
                <Input value={editingUser.email} disabled className="opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Role</label>
                <Select value={editRole} onValueChange={(v) => v && setEditRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.filter((r) => r.value !== 'all').map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Job Grade</label>
                <Input
                  value={editJobGrade}
                  onChange={(e) => setEditJobGrade(e.target.value)}
                  placeholder="e.g., L3"
                  className="font-[family-name:var(--font-mono)]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
