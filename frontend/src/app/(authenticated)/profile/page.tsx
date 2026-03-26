'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  UserIcon,
  MailIcon,
  ShieldIcon,
  BuildingIcon,
  BriefcaseIcon,
  PencilIcon,
  LockIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  CameraIcon,
} from 'lucide-react';
import { formatRole } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  department: string | null;
  jobGrade: string | null;
  avatarUrl: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/20',
  charge_manager: 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border-[var(--accent-teal)]/20',
  pmo: 'bg-blue-50 text-blue-700 border-blue-200',
  finance: 'bg-[var(--accent-green-light)] text-[var(--accent-green)] border-[var(--accent-green)]/20',
  employee: 'bg-stone-100 text-[var(--text-secondary)] border-stone-200',
};

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (!email || email.length === 0) return '?';
  return email[0].toUpperCase();
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  function startEditing() {
    setEditName(user?.fullName || '');
    setEditDepartment(user?.department || '');
    setIsEditing(true);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
      await api.put('/users/me/avatar', { avatarUrl: urlData.publicUrl });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAvatarError('Upload failed. Please try again.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              <Avatar className="h-20 w-20">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName || 'Avatar'} />}
                <AvatarFallback className="bg-[var(--accent-teal)] text-white text-2xl font-semibold font-[family-name:var(--font-heading)]">
                  {getInitials(user?.fullName || null, user?.email || '')}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Change photo"
              >
                {uploadingAvatar ? (
                  <Loader2Icon className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <CameraIcon className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {avatarError && (
                <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-500 text-center whitespace-nowrap">
                  {avatarError}
                </p>
              )}
            </div>

            {/* User info */}
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
                {user?.fullName || 'Unnamed User'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className={ROLE_COLORS[user?.role || 'employee'] || ''}>
                  {formatRole(user?.role || 'employee')}
                </Badge>
                {user?.department && (
                  <Badge variant="outline" className="text-[var(--text-secondary)]">
                    {user.department}
                  </Badge>
                )}
                {user?.jobGrade && (
                  <Badge variant="outline" className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                    {user.jobGrade}
                  </Badge>
                )}
              </div>
            </div>

            {/* Edit button */}
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <PencilIcon className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Details / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Profile' : 'Profile Details'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Update your personal information.' : 'Your account information and details.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Full Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Email
                  <span className="text-[var(--text-muted)] text-xs ml-2">(read-only)</span>
                </label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                  Role
                  <span className="text-[var(--text-muted)] text-xs ml-2">(read-only)</span>
                </label>
                <Input value={formatRole(user?.role || '')} disabled className="opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Department</label>
                <Input
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="Your department"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await api.put('/users/me', {
                        fullName: editName,
                        department: editDepartment,
                      });
                      await queryClient.invalidateQueries({ queryKey: ['me'] });
                      setIsEditing(false);
                    } catch (e) {
                      console.error('Failed to update profile:', e);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving && <Loader2Icon className="w-4 h-4 animate-spin mr-1" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-[var(--border-default)]">
              <ProfileField
                icon={<UserIcon className="w-4 h-4" />}
                label="Full Name"
                value={user?.fullName || '-'}
              />
              <ProfileField
                icon={<MailIcon className="w-4 h-4" />}
                label="Email"
                value={user?.email || '-'}
              />
              <ProfileField
                icon={<ShieldIcon className="w-4 h-4" />}
                label="Role"
                value={
                  <Badge variant="outline" className={ROLE_COLORS[user?.role || 'employee'] || ''}>
                    {formatRole(user?.role || 'employee')}
                  </Badge>
                }
              />
              <ProfileField
                icon={<BuildingIcon className="w-4 h-4" />}
                label="Department"
                value={user?.department || '-'}
              />
              <ProfileField
                icon={<BriefcaseIcon className="w-4 h-4" />}
                label="Job Grade"
                value={
                  <span className="font-[family-name:var(--font-mono)]">
                    {user?.jobGrade || '-'}
                  </span>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Current Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">New Password</label>
            <Input type="password" placeholder="Enter new password" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Confirm New Password</label>
            <Input type="password" placeholder="Confirm new password" />
          </div>
          <div className="flex justify-end">
            <Button>Update Password</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
