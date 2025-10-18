import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import Modal from '../../components/ui/Modal';
import Tab from '../../components/ui/Tab';
import ExpenseCard from '../../components/expenses/ExpenseCard';
import MemberCard from '../../components/groups/MemberCard';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export default function GroupDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { getGroupById, deleteGroup, leaveGroup, loading } = useGroups();
  const { getGroupExpenses } = useExpenses();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
      fetchGroupExpenses();
    }
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const result = await getGroupById(id);
      if (result.success) {
        setGroup(result.data);
      } else {
        toast.error('Group not found');
        router.push('/groups');
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group details');
    }
  };

  const fetchGroupExpenses = async () => {
    try {
      const result = await getGroupExpenses(id);
      if (result.success) {
        setExpenses(result.data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteGroup(id);
      if (result.success) {
        toast.success('Group deleted successfully');
        router.push('/groups');
      } else {
        toast.error(result.message || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
    setShowDeleteModal(false);
  };

  const handleLeave = async () => {
    try {
      const result = await leaveGroup(id);
      if (result.success) {
        toast.success('Left group successfully');
        router.push('/groups');
      } else {
        toast.error(result.message || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
    setShowLeaveModal(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      // Invite member API call
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);
      fetchGroupDetails(); // Refresh to show updated member list
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    }
    setInviting(false);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Join ${group.name} on SplitSafeX`,
        text: `Join our expense group "${group.name}" to split costs and track expenses together.`,
        url: `${window.location.origin}/groups/join/${group.inviteCode}`
      });
    } catch (error) {
      // Fallback to clipboard
      const inviteLink = `${window.location.origin}/groups/join/${group.inviteCode}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard');
    }
  };

  const calculateBalances = () => {
    if (!group || !group.members) return {};
    
    const balances = {};
    group.members.forEach(member => {
      balances[member.userId] = member.balance || 0;
    });
    return balances;
  };

  const getExpenseStats = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const myExpenses = expenses.filter(exp => exp.createdBy === user.id);
    const myTotal = myExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      totalExpenses,
      myTotal,
      expenseCount: expenses.length,
      myExpenseCount: myExpenses.length
    };
  };

  const canEdit = group && (group.createdBy === user.id || group.admins?.includes(user.id));
  const canDelete = group && group.createdBy === user.id;
  const canLeave = group && group.createdBy !== user.id;
  const balances = calculateBalances();
  const stats = getExpenseStats();

  if (loading || !group) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[400px]">
            <Loading size="lg" />
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'expenses', label: 'Expenses', count: stats.expenseCount },
    { id: 'members', label: 'Members', count: group.members?.length || 0 },
    { id: 'balances', label: 'Balances', count: null },
    { id: 'activity', label: 'Activity', count: null }
  ];

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>{group.name} - SplitSafeX</title>
          <meta name="description" content={`Expense group: ${group.name}`} />
        </Head>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Groups
              </Button>
              <div className="flex-1" />
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  onClick={handleShare}
                  className="flex items-center"
                >
                  <ShareIcon className="h-5 w-5 mr-2" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Invite
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/groups/${id}/edit`)}
                    className="flex items-center"
                  >
                    <PencilIcon className="h-5 w-5 mr-2" />
                    Edit
                  </Button>
                )}
                {canLeave && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowLeaveModal(true)}
                    className="flex items-center text-red-600 hover:text-red-700"
                  >
                    Leave Group
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Group Header Info */}
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      {group.members?.length || 0} members
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Created {formatDate(group.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <TagIcon className="h-4 w-4 mr-1" />
                      {group.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Group Expenses
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalExpenses)}
                  </div>
                  {group.members && (
                    <div className="mt-2 text-sm">
                      <span className={`font-medium ${
                        balances[user.id] > 0 ? 'text-green-600' : 
                        balances[user.id] < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {balances[user.id] > 0 && `You are owed ${formatCurrency(Math.abs(balances[user.id]))}`}
                        {balances[user.id] < 0 && `You owe ${formatCurrency(Math.abs(balances[user.id]))}`}
                        {balances[user.id] === 0 && 'You are settled up'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <Tab
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                          <CurrencyDollarIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Total Expenses
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.totalExpenses)}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            My Expenses
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stats.myTotal)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Recent Expenses */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Recent Expenses
                      </h3>
                      <Link href={`/expenses?group=${id}`}>
                        <Button variant="ghost" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {expenses.slice(0, 5).map((expense) => (
                        <ExpenseCard
                          key={expense.id}
                          expense={expense}
                          showGroup={false}
                          compact
                        />
                      ))}
                      {expenses.length === 0 && (
                        <div className="text-center py-8">
                          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                            No expenses yet
                          </h3>
                          <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Add the first expense to get started
                          </p>
                          <div className="mt-4">
                            <Link href={`/expenses/add?group=${id}`}>
                              <Button>
                                Add Expense
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Link href={`/expenses/add?group=${id}`}>
                        <Button className="w-full justify-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                          Add Expense
                        </Button>
                      </Link>
                      <Link href={`/settlements?group=${id}`}>
                        <Button variant="outline" className="w-full justify-center">
                          <BanknotesIcon className="h-4 w-4 mr-2" />
                          Settle Up
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => setShowInviteModal(true)}
                      >
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        Invite Members
                      </Button>
                    </div>
                  </div>

                  {/* Members Preview */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Members ({group.members?.length || 0})
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('members')}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {group.members?.slice(0, 4).map((member) => (
                        <div key={member.userId} className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.name}
                            </p>
                            <p className={`text-xs ${
                              member.balance > 0 ? 'text-green-600' : 
                              member.balance < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {member.balance === 0 
                                ? 'Settled up' 
                                : formatCurrency(Math.abs(member.balance))
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                      {(group.members?.length || 0) > 4 && (
                        <p className="text-sm text-gray-500 text-center">
                          +{(group.members.length || 0) - 4} more members
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'expenses' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Group Expenses ({stats.expenseCount})
                  </h3>
                  <Link href={`/expenses/add?group=${id}`}>
                    <Button>
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      showGroup={false}
                    />
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-center py-12">
                      <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                        No expenses in this group yet
                      </h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Add the first expense to start tracking shared costs
                      </p>
                      <div className="mt-6">
                        <Link href={`/expenses/add?group=${id}`}>
                          <Button>
                            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                            Add First Expense
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === 'members' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Group Members ({group.members?.length || 0})
                  </h3>
                  <Button onClick={() => setShowInviteModal(true)}>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.members?.map((member) => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      isAdmin={group.admins?.includes(member.userId)}
                      isOwner={group.createdBy === member.userId}
                      canManage={canEdit}
                    />
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'balances' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Member Balances
                </h3>
                <div className="space-y-4">
                  {group.members?.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          member.balance > 0 ? 'text-green-600' : 
                          member.balance < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {member.balance === 0 
                            ? 'Settled up'
                            : `${member.balance > 0 ? 'Gets back' : 'Owes'} ${formatCurrency(Math.abs(member.balance))}`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link href={`/settlements?group=${id}`}>
                    <Button>
                      <BanknotesIcon className="h-5 w-5 mr-2" />
                      Settle All Balances
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {activeTab === 'activity' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {/* Activity items would be loaded from API */}
                  <div className="text-center py-8">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      Activity tracking coming soon
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      Track group activity, member joins, expenses, and settlements
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Invite Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Invite Member"
          size="sm"
        >
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  loading={inviting}
                  className="flex-1"
                >
                  Send Invite
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Group"
          size="sm"
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <p className="text-gray-900 dark:text-white">
                Are you sure you want to delete this group? This action cannot be undone and will delete all associated expenses.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                loading={loading}
              >
                Delete Group
              </Button>
            </div>
          </div>
        </Modal>

        {/* Leave Group Modal */}
        <Modal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Leave Group"
          size="sm"
        >
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-900 dark:text-white">
                Are you sure you want to leave this group? You will lose access to all group expenses and balances.
              </p>
              {balances[user.id] !== 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Warning:</strong> You have an outstanding balance of{' '}
                    <span className="font-semibold">
                      {formatCurrency(Math.abs(balances[user.id]))}
                    </span>
                    . Please settle up before leaving.
                  </p>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowLeaveModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLeave}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                loading={loading}
              >
                Leave Group
              </Button>
            </div>
          </div>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}