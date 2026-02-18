import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../services/api.service';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';

type SortMode = 'new' | 'hot' | 'top';

export const ForumPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('new');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getPosts(sort, search || undefined) as Post[];
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sort, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleVote = async (postId: string, value: 1 | -1) => {
    try {
      const result = await ApiService.votePost(postId, value) as { userVote: number };
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const oldVote = p.userVote;
        const newVote = result.userVote;
        return {
          ...p,
          userVote: newVote,
          voteScore: p.voteScore - oldVote + newVote,
        };
      }));
    } catch (err: any) {
      console.error('Vote failed:', err);
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString('de-DE');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Essensgruppe Forum</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </button>
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search posts..."
                className="input flex-1"
              />
              <button type="submit" className="btn btn-outline px-4">
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput(''); }}
                  className="btn btn-outline px-3 text-red-500 border-red-300 hover:bg-red-50"
                >
                  Clear
                </button>
              )}
            </form>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['new', 'hot', 'top'] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sort === mode
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'new' ? 'New' : mode === 'hot' ? 'Hot' : 'Top'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              {search ? 'No posts found' : 'No posts yet'}
            </h2>
            <p className="text-gray-500 mb-6">
              {search ? 'Try a different search term.' : 'Be the first to start a discussion!'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create First Post
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex">
                    {/* Vote column */}
                    <div className="flex flex-col items-center gap-1 px-3 py-4 bg-gray-50 rounded-l-xl">
                      <button
                        onClick={(e) => { e.preventDefault(); handleVote(post.id, 1); }}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                          post.userVote === 1 ? 'text-orange-500' : 'text-gray-400'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className={`text-sm font-bold ${
                        post.voteScore > 0 ? 'text-orange-500' :
                        post.voteScore < 0 ? 'text-blue-500' : 'text-gray-500'
                      }`}>
                        {post.voteScore}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); handleVote(post.id, -1); }}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                          post.userVote === -1 ? 'text-blue-500' : 'text-gray-400'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <Link to={`/forum/${post.id}`} className="flex-1 p-4 min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                            {post.user.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{post.user.username}</span>
                        </div>
                        <span>{timeAgo(post.createdAt)}</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{post.commentCount} comments</span>
                        </div>
                      </div>
                    </Link>

                    {/* Thumbnail if image */}
                    {post.imageUrl && (
                      <div className="hidden sm:block w-24 h-24 m-4 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePostModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(newPost) => {
              setPosts(prev => [newPost, ...prev]);
              setShowCreateModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Create Post Modal Component
const CreatePostModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (post: Post) => void;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const post = await ApiService.createPost({ title: title.trim(), content: content.trim() }) as Post;
      onCreated(post);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Post</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="An interesting title..."
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/200</p>
            </div>

            <div>
              <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="post-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input min-h-[200px] resize-y"
                placeholder="What's on your mind?"
                maxLength={10000}
                required
              />
              <p className="text-xs text-gray-400 mt-1">{content.length}/10000</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};
