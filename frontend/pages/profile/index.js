import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  UserCircleIcon,
  EnvelopeIcon,
  BellIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CameraIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, updateProfile, changePassword, updateNotificationSettings, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: null
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    expenseAlerts: true,
    groupInvites: true,
    settlementReminders: true,
    fraudAlerts: true,
    marketingEmails: false
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || null
      });
      setNotificationSettings(user.notificationSettings || notificationSettings);
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (result.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  const handleNotificationUpdate = async () => {
    try {
      const result = await updateNotificationSettings(notificationSettings);
      if (result.success) {
        toast.success('Notification settings updated');
      } else {
        toast.error('Failed to update notification settings');
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notification settings');
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setProfileData(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon }
  ];

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Profile Settings - SplitSafeX</title>
          <meta name="description" content="Manage your profile, security settings, and notifications." />
        </Head>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Profile Settings
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <tab.icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </Card>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {activeTab === 'profile' && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Profile Information
                    </h2>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center overflow-hidden">
                          {profileData.avatar ? (
                            <img
                              src={profileData.avatar}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                              {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        {isEditing && (
                          <label className="absolute -bottom-2 -right-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-1 cursor-pointer">
                            <CameraIcon className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                        <p className="text-sm text-gray-500">
                          Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input
                        label="First Name"
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          firstName: e.target.value
                        }))}
                        disabled={!isEditing}
                        required
                      />
                      <Input
                        label="Last Name"
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          lastName: e.target.value
                        }))}
                        disabled={!isEditing}
                        required
                      />
                    </div>

                    <Input
                      label="Email Address"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      disabled={!isEditing}
                      required
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                      disabled={!isEditing}
                      placeholder="(555) 123-4567"
                    />

                    {isEditing && (
                      <div className="flex space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            // Reset form to original values
                            setProfileData({
                              firstName: user.firstName || '',
                              lastName: user.lastName || '',
                              email: user.email || '',
                              phone: user.phone || '',
                              avatar: user.avatar || null
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          loading={loading}
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </form>
                </Card>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Change Password */}
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Change Password
                    </h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="relative">
                        <Input
                          label="Current Password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            currentPassword: e.target.value
                          }))}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          label="New Password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            newPassword: e.target.value
                          }))}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          label="Confirm New Password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            confirmPassword: e.target.value
                          }))}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Password Requirements:
                        </h4>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <li className={passwordData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                            • At least 8 characters long
                          </li>
                          <li className={/[A-Z]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                            • Contains uppercase letter
                          </li>
                          <li className={/[a-z]/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                            • Contains lowercase letter
                          </li>
                          <li className={/\d/.test(passwordData.newPassword) ? 'text-green-600' : ''}>
                            • Contains number
                          </li>
                        </ul>
                      </div>

                      <Button
                        type="submit"
                        loading={loading}
                        className="w-full sm:w-auto"
                      >
                        Change Password
                      </Button>
                    </form>
                  </Card>

                  {/* Security Settings */}
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Security Settings
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Enable 2FA
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Login Sessions
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Manage and monitor your active sessions
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          View Sessions
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Account Backup
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Download your account data and transaction history
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Download Data
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'notifications' && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Notification Preferences
                    </h2>
                    <Button
                      onClick={handleNotificationUpdate}
                      loading={loading}
                    >
                      Save Settings
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Email Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Email Notifications
                      </h3>
                      <div className="space-y-3">
                        {[
                          {
                            key: 'emailNotifications',
                            label: 'Email Notifications',
                            description: 'Receive notifications via email'
                          },
                          {
                            key: 'expenseAlerts',
                            label: 'Expense Alerts',
                            description: 'Get notified when new expenses are added to your groups'
                          },
                          {
                            key: 'groupInvites',
                            label: 'Group Invitations',
                            description: 'Receive invitations to join new expense groups'
                          },
                          {
                            key: 'settlementReminders',
                            label: 'Settlement Reminders',
                            description: 'Get reminded about pending settlements'
                          },
                          {
                            key: 'fraudAlerts',
                            label: 'Fraud Alerts',
                            description: 'Receive notifications about suspicious activities'
                          }
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {setting.label}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {setting.description}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationSettings[setting.key]}
                                onChange={(e) => setNotificationSettings(prev => ({
                                  ...prev,
                                  [setting.key]: e.target.checked
                                }))}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Push Notifications
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Push Notifications
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Receive push notifications on your devices
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={notificationSettings.pushNotifications}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                pushNotifications: e.target.checked
                              }))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Marketing */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Marketing & Updates
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Marketing Emails
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Receive updates about new features and promotions
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={notificationSettings.marketingEmails}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                marketingEmails: e.target.checked
                              }))}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}