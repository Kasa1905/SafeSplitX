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
import { useExpenses } from '../../hooks/useExpenses';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CameraIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

export default function ExpenseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { getExpenseById, deleteExpense, loading } = useExpenses();
  const [expense, setExpense] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExpenseDetails();
    }
  }, [id]);

  const fetchExpenseDetails = async () => {
    try {
      const result = await getExpenseById(id);
      if (result.success) {
        setExpense(result.data);
        setComments(result.data.comments || []);
      } else {
        toast.error('Expense not found');
        router.push('/expenses');
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      toast.error('Failed to load expense details');
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteExpense(id);
      if (result.success) {
        toast.success('Expense deleted successfully');
        router.push('/expenses');
      } else {
        toast.error(result.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
    setShowDeleteModal(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setAddingComment(true);
    try {
      // Add comment API call
      const commentData = {
        text: newComment,
        author: user.firstName + ' ' + user.lastName,
        timestamp: new Date().toISOString()
      };
      
      setComments([...comments, commentData]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
    setAddingComment(false);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Expense: ${expense.description}`,
        text: `Check out this expense on SplitSafeX: ${expense.description} - ${formatCurrency(expense.amount)}`,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const canEdit = expense && (expense.createdBy === user.id || expense.groupAdmins?.includes(user.id));
  const canDelete = canEdit;

  if (loading || !expense) {
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

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>{expense.description} - SplitSafeX</title>
          <meta name="description" content={`Expense details for ${expense.description}`} />
        </Head>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back
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
                {canEdit && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/expenses/${id}/edit`)}
                    className="flex items-center"
                  >
                    <PencilIcon className="h-5 w-5 mr-2" />
                    Edit
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense Overview */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {expense.description}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{formatDate(expense.date)}</span>
                      <span>•</span>
                      <span>{expense.category}</span>
                      <span>•</span>
                      <Link
                        href={`/groups/${expense.groupId}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {expense.groupName}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </div>
                    {expense.fraudScore > 0.7 && (
                      <div className="mt-2 flex items-center text-red-600">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">Fraud Alert</span>
                      </div>
                    )}
                  </div>
                </div>

                {expense.notes && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300">{expense.notes}</p>
                  </div>
                )}

                {/* Receipt */}
                {expense.receipt && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Receipt
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReceiptModal(true)}
                      >
                        <CameraIcon className="h-4 w-4 mr-2" />
                        View Receipt
                      </Button>
                    </div>
                    <div className="mt-2">
                      <img
                        src={expense.receipt.url}
                        alt="Receipt"
                        className="w-32 h-40 object-cover rounded-lg cursor-pointer"
                        onClick={() => setShowReceiptModal(true)}
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Split Details */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Split Details
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Split Method
                    </span>
                    <span className="font-medium capitalize">
                      {expense.splitMethod}
                    </span>
                  </div>
                  
                  {expense.participants.map((participant) => (
                    <div key={participant.userId} className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-gray-900 dark:text-white">
                          {participant.name}
                        </span>
                        {participant.userId === expense.createdBy && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            Paid
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(participant.amount)}
                        </div>
                        {expense.splitMethod !== 'equal' && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {participant.percentage}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Comments Section */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <ChatBubbleBottomCenterTextIcon className="h-5 w-5 mr-2" />
                  Comments ({comments.length})
                </h3>
                
                {/* Add Comment */}
                <div className="mb-6">
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        {user.firstName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || addingComment}
                          loading={addingComment}
                        >
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment, index) => (
                    <div key={index} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-400 font-semibold text-sm">
                          {comment.author.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {comment.author}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => router.push(`/settlements?expense=${id}`)}
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Settle Up
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => router.push(`/groups/${expense.groupId}`)}
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    View Group
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => window.print()}
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </Card>

              {/* Group Info */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Group Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Group Name</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {expense.groupName}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Members</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {expense.participants.length} people
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Created By</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {expense.createdByName}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Fraud Detection */}
              {expense.fraudScore > 0.3 && (
                <Card className="p-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-center mb-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                      Security Notice
                    </h3>
                  </div>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    This expense has been flagged by our fraud detection system. 
                    Fraud Score: {(expense.fraudScore * 100).toFixed(1)}%
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                    onClick={() => router.push(`/fraud?expense=${id}`)}
                  >
                    View Details
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Expense"
          size="sm"
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <p className="text-gray-900 dark:text-white">
                Are you sure you want to delete this expense? This action cannot be undone.
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
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* Receipt Modal */}
        <Modal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          title="Receipt"
          size="lg"
        >
          <div className="p-6">
            {expense.receipt && (
              <img
                src={expense.receipt.url}
                alt="Receipt"
                className="w-full max-w-2xl mx-auto rounded-lg"
              />
            )}
          </div>
        </Modal>
      </Layout>
    </AuthGuard>
  );
}