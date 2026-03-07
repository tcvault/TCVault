import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SocialPost, PostTag, User, ViewMode, SocialComment, WantItem, ReleaseThread, ReleaseThreadComment, AppAlert } from '../types';
import { MessageSquare, Heart, Share2, ImageIcon, Send, X, Loader2, RefreshCw, Trash2, Flag, EyeOff, Bell, CheckCircle2 } from 'lucide-react';
import { vaultStorage } from '../services/storage';
import EmptyState from './EmptyState';

interface FeedProps {
  user: User | null;
  onNavigate: (view: ViewMode) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  animationClass?: string;
  highlightedPostId?: string | null;
  onClearHighlight?: () => void;
}

type CommunitySurface = 'posts' | 'wants' | 'threads';

const POSTS_PAGE_SIZE = 20;
const WANTS_PAGE_SIZE = 20;
const THREADS_PAGE_SIZE = 12;
const ALERTS_PAGE_SIZE = 20;

const getRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const Feed: React.FC<FeedProps> = ({ user, onNavigate, onToast, animationClass, highlightedPostId, onClearHighlight }) => {
  const [surface, setSurface] = useState<CommunitySurface>('posts');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [wants, setWants] = useState<WantItem[]>([]);
  const [threads, setThreads] = useState<ReleaseThread[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [hasMoreWants, setHasMoreWants] = useState(false);
  const [hasMoreThreads, setHasMoreThreads] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingMoreWants, setLoadingMoreWants] = useState(false);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<PostTag>('General');
  const [activeFilter, setActiveFilter] = useState<'All' | PostTag>('All');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const [newWantTitle, setNewWantTitle] = useState('');
  const [newWantDetails, setNewWantDetails] = useState('');
  const [newWantSetKey, setNewWantSetKey] = useState('');
  const [newWantPrice, setNewWantPrice] = useState('');
  const [isSavingWant, setIsSavingWant] = useState(false);

  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newThreadSetKey, setNewThreadSetKey] = useState('');
  const [isSavingThread, setIsSavingThread] = useState(false);

  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [threadReplyDrafts, setThreadReplyDrafts] = useState<Record<string, string>>({});
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchCommunity = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [postData, wantData, threadData] = await Promise.all([
        vaultStorage.getPosts({ limit: POSTS_PAGE_SIZE, offset: 0 }),
        vaultStorage.getWants({ limit: WANTS_PAGE_SIZE, offset: 0 }),
        vaultStorage.getReleaseThreads({ limit: THREADS_PAGE_SIZE, offset: 0 }),
      ]);
      setPosts(postData);
      setWants(wantData);
      setThreads(threadData);
      setHasMorePosts(postData.length === POSTS_PAGE_SIZE);
      setHasMoreWants(wantData.length === WANTS_PAGE_SIZE);
      setHasMoreThreads(threadData.length === THREADS_PAGE_SIZE);

      if (user) {
        const [alertData, hidden] = await Promise.all([
          vaultStorage.getAlerts({ limit: ALERTS_PAGE_SIZE, offset: 0 }),
          Promise.resolve(vaultStorage.getHiddenPosts(user.id)),
        ]);
        setAlerts(alertData);
        setHiddenPostIds(new Set(hidden));
      } else {
        setAlerts([]);
        setHiddenPostIds(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch community data:', error);
      if (onToast) onToast('Failed to refresh community data.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [onToast, user]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  useEffect(() => {
    if (highlightedPostId && posts.length > 0) {
      const timer = setTimeout(() => {
        const element = postRefs.current[highlightedPostId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-gold-500', 'ring-offset-4', 'ring-offset-surface-base');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-gold-500', 'ring-offset-4', 'ring-offset-surface-base');
            if (onClearHighlight) onClearHighlight();
          }, 2500);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [highlightedPostId, posts.length, onClearHighlight]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostContent.trim()) return;

    setIsPosting(true);
    try {
      let finalImageUrl = postImage;
      if (postImage && postImage.startsWith('data:')) {
        finalImageUrl = await vaultStorage.uploadImage(user.id, postImage);
      }

      const newPost: SocialPost = {
        id: crypto.randomUUID(),
        userId: user.id,
        username: user.username,
        userAvatar: user.avatar,
        content: newPostContent,
        tag: selectedTag,
        likes: [],
        commentCount: 0,
        createdAt: Date.now(),
        imageUrl: finalImageUrl || undefined,
        comments: [],
      };

      await vaultStorage.savePost(newPost);
      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
      setPostImage(null);
      setSelectedTag('General');
      if (onToast) onToast('Post published.', 'success');
    } catch {
      if (onToast) onToast('Post failed to publish.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveWant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newWantTitle.trim()) return;

    setIsSavingWant(true);
    try {
      const parsedTarget = newWantPrice ? Number(newWantPrice) : undefined;
      if (parsedTarget !== undefined && (!Number.isFinite(parsedTarget) || parsedTarget < 0)) {
        if (onToast) onToast('Target price must be a valid positive number.', 'error');
        return;
      }

      const want: WantItem = {
        id: crypto.randomUUID(),
        userId: user.id,
        username: user.username,
        userAvatar: user.avatar,
        title: newWantTitle.trim(),
        details: newWantDetails.trim() || undefined,
        setCanonicalKey: newWantSetKey.trim() || undefined,
        setDisplay: newWantSetKey.trim() || undefined,
        targetPriceGbp: parsedTarget,
        status: 'open',
        createdAt: Date.now(),
      };

      await vaultStorage.saveWant(want);
      setWants(prev => [want, ...prev]);
      setNewWantTitle('');
      setNewWantDetails('');
      setNewWantSetKey('');
      setNewWantPrice('');
      if (onToast) onToast('Want posted. Matching alerts sent where possible.', 'success');
    } catch {
      if (onToast) onToast('Failed to post want.', 'error');
    } finally {
      setIsSavingWant(false);
    }
  };

  const handleFulfillWant = async (want: WantItem) => {
    try {
      await vaultStorage.updateWantStatus(want.id, 'fulfilled');
      setWants(prev => prev.map(w => (w.id === want.id ? { ...w, status: 'fulfilled' } : w)));
      if (onToast) onToast('Want marked as fulfilled.', 'success');
    } catch {
      if (onToast) onToast('Failed to update want.', 'error');
    }
  };

  const handleSaveThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newThreadTitle.trim()) return;

    setIsSavingThread(true);
    try {
      const thread: ReleaseThread = {
        id: crypto.randomUUID(),
        creatorUserId: user.id,
        username: user.username,
        userAvatar: user.avatar,
        title: newThreadTitle.trim(),
        body: newThreadBody.trim() || undefined,
        setCanonicalKey: newThreadSetKey.trim() || undefined,
        setDisplay: newThreadSetKey.trim() || undefined,
        category: 'release',
        createdAt: Date.now(),
        commentCount: 0,
        comments: [],
      };

      await vaultStorage.saveReleaseThread(thread);
      setThreads(prev => [thread, ...prev]);
      setNewThreadTitle('');
      setNewThreadBody('');
      setNewThreadSetKey('');
      if (onToast) onToast('Release thread created.', 'success');
    } catch {
      if (onToast) onToast('Failed to create thread.', 'error');
    } finally {
      setIsSavingThread(false);
    }
  };

  const handleThreadReply = async (thread: ReleaseThread) => {
    const draft = threadReplyDrafts[thread.id] || '';
    if (!user || !draft.trim()) return;
    const comment: ReleaseThreadComment = {
      id: crypto.randomUUID(),
      threadId: thread.id,
      userId: user.id,
      username: user.username,
      userAvatar: user.avatar,
      body: draft.trim(),
      createdAt: Date.now(),
    };

    try {
      await vaultStorage.addReleaseThreadComment(comment);
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, comments: [...t.comments, comment], commentCount: t.commentCount + 1 } : t));
      setThreadReplyDrafts(prev => ({ ...prev, [thread.id]: '' }));
    } catch {
      if (onToast) onToast('Failed to add thread reply.', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (deletingPostId !== postId) {
      setDeletingPostId(postId);
      setTimeout(() => setDeletingPostId(null), 2500);
      return;
    }

    try {
      await vaultStorage.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setDeletingPostId(null);
      if (onToast) onToast('Post deleted.', 'success');
    } catch {
      if (onToast) onToast('Failed to delete post.', 'error');
    }
  };

  const handleReportPost = async (postId: string) => {
    try {
      await vaultStorage.reportPost(postId, 'Community report from feed');
      if (onToast) onToast('Post reported for review.', 'info');
    } catch {
      if (onToast) onToast('Report failed.', 'error');
    }
  };

  const toggleHidePost = (postId: string) => {
    if (!user) return;
    const next = vaultStorage.toggleHiddenPost(user.id, postId);
    setHiddenPostIds(new Set(next));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPostImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      onNavigate(ViewMode.SETTINGS);
      return;
    }
    try {
      await vaultStorage.toggleLike(postId, user.id);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes.includes(user.id) ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id] } : p));
    } catch {
      if (onToast) onToast('Like failed.', 'error');
    }
  };

  const handleComment = async (postId: string) => {
    const draft = commentDrafts[postId] || '';
    if (!user || !draft.trim()) return;
    const newComment: SocialComment = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      userAvatar: user.avatar,
      content: draft.trim(),
      createdAt: Date.now(),
    };

    try {
      await vaultStorage.addComment(postId, newComment);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment], commentCount: p.commentCount + 1 } : p));
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
    } catch {
      if (onToast) onToast('Comment failed.', 'error');
    }
  };

  const handleShare = async (post: SocialPost) => {
    const shareData = { title: 'TC Vault Collector Post', text: post.content, url: `${window.location.origin}?post=${post.id}` };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        if (onToast) onToast('Post link copied.', 'info');
      }
    } catch {
      // ignore cancellation
    }
  };


  const markAlertRead = async (alertId: string) => {
    try {
      await vaultStorage.markAlertRead(alertId);
      setAlerts(prev => prev.map(alert => (alert.id === alertId ? { ...alert, isRead: true, readAt: Date.now() } : alert)));
    } catch {
      if (onToast) onToast('Failed to mark alert as read.', 'error');
    }
  };

  const loadMorePosts = async () => {
    if (loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const next = await vaultStorage.getPosts({ limit: POSTS_PAGE_SIZE, offset: posts.length });
      setPosts(prev => [...prev, ...next]);
      setHasMorePosts(next.length === POSTS_PAGE_SIZE);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const loadMoreWants = async () => {
    if (loadingMoreWants || !hasMoreWants) return;
    setLoadingMoreWants(true);
    try {
      const next = await vaultStorage.getWants({ limit: WANTS_PAGE_SIZE, offset: wants.length });
      setWants(prev => [...prev, ...next]);
      setHasMoreWants(next.length === WANTS_PAGE_SIZE);
    } finally {
      setLoadingMoreWants(false);
    }
  };

  const loadMoreThreads = async () => {
    if (loadingMoreThreads || !hasMoreThreads) return;
    setLoadingMoreThreads(true);
    try {
      const next = await vaultStorage.getReleaseThreads({ limit: THREADS_PAGE_SIZE, offset: threads.length });
      setThreads(prev => [...prev, ...next]);
      setHasMoreThreads(next.length === THREADS_PAGE_SIZE);
    } finally {
      setLoadingMoreThreads(false);
    }
  };

  const getAlertMessage = (alert: AppAlert) => {
    if (alert.alertType === 'want_match') {
      const title = typeof alert.payload.wantTitle === 'string' ? alert.payload.wantTitle : 'your want';
      const cardPlayer = typeof alert.payload.matchedCardPlayer === 'string' ? alert.payload.matchedCardPlayer : 'a card';
      return `Match found for ${title}: ${cardPlayer}.`;
    }
    if (alert.alertType === 'thread_reply') {
      const threadTitle = typeof alert.payload.threadTitle === 'string' ? alert.payload.threadTitle : 'your thread';
      return `New reply on ${threadTitle}.`;
    }
    return 'New community alert.';
  };

  const unreadAlerts = alerts.filter(a => !a.isRead);
  const visiblePosts = (activeFilter === 'All' ? posts : posts.filter(p => p.tag === activeFilter))
    .filter(p => !hiddenPostIds.has(p.id));

  return (
    <div className={`space-y-major max-w-2xl mx-auto px-3 sm:px-0 pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex items-end justify-between px-1 md:px-0">
        <div className="space-y-control">
          <span className="text-micro font-semibold text-ink-secondary/60 uppercase tracking-widest">Community Pulse</span>
          <h1>Collector's Corner</h1>
          <p className="text-sm text-ink-tertiary">Pickups, wants, and release threads in one place.</p>
        </div>
        <button onClick={fetchCommunity} className={`p-2 text-ink-tertiary hover:text-gold-500 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex items-center gap-control overflow-x-auto no-scrollbar pb-1">
        <SurfaceButton active={surface === 'posts'} onClick={() => setSurface('posts')}>Posts</SurfaceButton>
        <SurfaceButton active={surface === 'wants'} onClick={() => setSurface('wants')}>Wants</SurfaceButton>
        <SurfaceButton active={surface === 'threads'} onClick={() => setSurface('threads')}>Release Threads</SurfaceButton>
      </div>

      {user && unreadAlerts.length > 0 && (
        <div className="card-vault p-padding space-y-control border-gold-500/20">
          <div className="flex items-center gap-control">
            <Bell size={14} className="text-gold-500" />
            <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Alerts</span>
          </div>
          {unreadAlerts.slice(0, 3).map(alert => (
            <button key={alert.id} className="w-full text-left p-2 rounded hover:bg-surface-base transition-colors" onClick={() => markAlertRead(alert.id)}>
              <p className="text-xs font-semibold text-ink-primary">{alert.alertType.replace('_', ' ')}</p>
              <p className="text-[11px] text-ink-tertiary">{getAlertMessage(alert)}</p>
            </button>
          ))}
        </div>
      )}

      {surface === 'posts' && user && (
        <form onSubmit={handlePost} className="card-vault space-y-padding shadow-xl">
          <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Share your latest pickup or update..." className="w-full bg-surface-base border border-border-soft rounded-xl p-padding text-sm font-semibold text-ink-primary focus:border-gold-500/30 outline-none resize-none min-h-[90px]" />
          {postImage && (
            <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-border-soft">
              <img src={postImage} className="w-full h-full object-cover" alt="Post" />
              <button type="button" onClick={() => setPostImage(null)} className="absolute top-1 right-1 bg-ink-primary/60 text-white p-1 rounded-full"><X size={12} /></button>
            </div>
          )}
          <div className="flex items-center justify-between gap-control">
            <div className="flex items-center gap-control">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-ink-tertiary hover:text-gold-500 transition-colors"><ImageIcon size={18} /></button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <TagPicker value={selectedTag} onChange={setSelectedTag} />
            </div>
            <button type="submit" disabled={isPosting || !newPostContent.trim()} className="btn-primary h-10 px-6 text-xs tracking-widest gap-2 disabled:opacity-50">
              {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post
            </button>
          </div>
        </form>
      )}

      {surface === 'wants' && user && (
        <form onSubmit={handleSaveWant} className="card-vault space-y-control p-padding">
          <input value={newWantTitle} onChange={(e) => setNewWantTitle(e.target.value)} placeholder="Want title (e.g. Saka Prizm Silver PSA 10)" className="w-full h-10 px-3 rounded-lg bg-surface-base border border-border-soft" />
          <input value={newWantSetKey} onChange={(e) => setNewWantSetKey(e.target.value)} placeholder="Set key/display (optional)" className="w-full h-10 px-3 rounded-lg bg-surface-base border border-border-soft" />
          <div className="grid grid-cols-3 gap-control">
            <input value={newWantPrice} onChange={(e) => setNewWantPrice(e.target.value)} placeholder="Target GBP" className="col-span-1 h-10 px-3 rounded-lg bg-surface-base border border-border-soft" />
            <input value={newWantDetails} onChange={(e) => setNewWantDetails(e.target.value)} placeholder="Details" className="col-span-2 h-10 px-3 rounded-lg bg-surface-base border border-border-soft" />
          </div>
          <button type="submit" disabled={isSavingWant || !newWantTitle.trim()} className="btn-primary h-10 px-4 text-xs tracking-widest disabled:opacity-50">{isSavingWant ? 'Saving...' : 'Post Want'}</button>
        </form>
      )}

      {surface === 'threads' && user && (
        <form onSubmit={handleSaveThread} className="card-vault space-y-control p-padding">
          <input value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} placeholder="Thread title" className="w-full h-10 px-3 rounded-lg bg-surface-base border border-border-soft" />
          <input value={newThreadSetKey} onChange={(e) => setNewThreadSetKey(e.target.value)} placeholder="Set key/display (optional)" className="w-full h-10 px-3 rounded-lg bg-surface-base border border-border-soft" />
          <textarea value={newThreadBody} onChange={(e) => setNewThreadBody(e.target.value)} placeholder="Start the discussion..." className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-surface-base border border-border-soft" />
          <button type="submit" disabled={isSavingThread || !newThreadTitle.trim()} className="btn-primary h-10 px-4 text-xs tracking-widest disabled:opacity-50">{isSavingThread ? 'Saving...' : 'Create Thread'}</button>
        </form>
      )}

      {surface === 'posts' && (
        <>
          <div className="flex items-center gap-control overflow-x-auto no-scrollbar pb-2">
            <FilterButton active={activeFilter === 'All'} onClick={() => setActiveFilter('All')}>All Activity</FilterButton>
            <FilterButton active={activeFilter === 'Pickup'} onClick={() => setActiveFilter('Pickup')}>Pickups</FilterButton>
            <FilterButton active={activeFilter === 'PC Update'} onClick={() => setActiveFilter('PC Update')}>PC Updates</FilterButton>
            <FilterButton active={activeFilter === 'Show Coverage'} onClick={() => setActiveFilter('Show Coverage')}>Events</FilterButton>
          </div>

          <div className="space-y-section">
            {visiblePosts.length > 0 ? visiblePosts.map(post => (
              <div key={post.id} ref={el => { postRefs.current[post.id] = el; }} className={`card-vault p-0 ${highlightedPostId === post.id ? 'border-gold-500' : ''}`}>
                <div className="p-padding space-y-padding">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-control">
                      <div className="w-10 h-10 rounded-full bg-surface-base border border-border-soft flex items-center justify-center overflow-hidden">
                        {post.userAvatar ? <img src={post.userAvatar} className="w-full h-full object-cover" alt="avatar" /> : post.username[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink-primary">@{post.username}</h4>
                        <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">{getRelativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-control">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${getTagColor(post.tag)}`}>{post.tag}</span>
                      {user && post.userId !== user.id && (
                        <button onClick={() => handleReportPost(post.id)} className="p-1.5 text-ink-tertiary hover:text-error"><Flag size={14} /></button>
                      )}
                      {user && (
                        <button onClick={() => toggleHidePost(post.id)} className="p-1.5 text-ink-tertiary hover:text-ink-primary"><EyeOff size={14} /></button>
                      )}
                      {user && post.userId === user.id && (
                        <button onClick={() => handleDeletePost(post.id)} className={`p-1.5 ${deletingPostId === post.id ? 'text-error' : 'text-ink-tertiary hover:text-error'}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-ink-secondary/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && <img src={post.imageUrl} className="max-w-full h-auto max-h-[70vh] rounded-xl border border-border-soft" alt="Post" />}

                  <div className="flex items-center gap-section pt-control">
                    <ActionButton icon={<Heart size={18} className={user && post.likes.includes(user.id) ? 'fill-rose-500 text-rose-500' : ''} />} label={post.likes.length.toString()} color="hover:text-rose-500" onClick={() => toggleLike(post.id)} />
                    <ActionButton icon={<MessageSquare size={18} />} label={post.commentCount.toString()} color="hover:text-gold-500" onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)} />
                    <ActionButton icon={<Share2 size={18} />} label="" color="hover:text-emerald-500" onClick={() => handleShare(post)} />
                  </div>

                  {expandedComments === post.id && (
                    <div className="pt-padding border-t border-border-soft space-y-padding">
                      <div className="space-y-padding max-h-64 overflow-y-auto no-scrollbar">
                        {post.comments.map(comment => (
                          <div key={comment.id} className="flex gap-control">
                            <div className="w-8 h-8 rounded-full bg-surface-base border border-border-soft flex items-center justify-center text-xs font-bold shrink-0">{comment.username[0]}</div>
                            <div className="flex-1 space-y-0.5">
                              <h5 className="text-[11px] font-bold text-ink-primary">@{comment.username}</h5>
                              <p className="text-xs text-ink-secondary/80">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {user && (
                        <div className="flex gap-control">
                          <input type="text" value={commentDrafts[post.id] || ''} onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))} placeholder="Add a comment..." className="flex-1 bg-surface-base border border-border-soft rounded-xl h-10 px-padding text-xs" />
                          <button onClick={() => handleComment(post.id)} disabled={!(commentDrafts[post.id] || '').trim()} className="p-2 text-gold-500 disabled:opacity-30"><Send size={18} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <EmptyState icon={<RefreshCw />} title="The feed is quiet" message="No visible posts in this filter." compact actionLabel="Refresh" onAction={fetchCommunity} />
            )}
            {hasMorePosts && (
              <div className="flex justify-center">
                <button onClick={loadMorePosts} disabled={loadingMorePosts} className="btn-secondary h-10 px-4 text-xs tracking-widest disabled:opacity-60">{loadingMorePosts ? 'Loading...' : 'Load More Posts'}</button>
              </div>
            )}
          </div>
        </>
      )}

      {surface === 'wants' && (
        <div className="space-y-section">
          {wants.length > 0 ? wants.map(want => (
            <div key={want.id} className="card-vault p-padding space-y-control">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-ink-primary">{want.title}</h4>
                  <p className="text-xs text-ink-tertiary uppercase tracking-widest">@{want.username} · {getRelativeTime(want.createdAt)}</p>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${want.status === 'open' ? 'bg-gold-500/10 text-gold-500' : 'bg-surface-base text-ink-tertiary'}`}>{want.status}</span>
              </div>
              {want.details && <p className="text-xs text-ink-secondary/80">{want.details}</p>}
              {(want.setDisplay || want.targetPriceGbp) && (
                <p className="text-xs text-ink-tertiary">{want.setDisplay ? `Set: ${want.setDisplay}` : ''} {want.targetPriceGbp ? `· Target: GBP ${want.targetPriceGbp}` : ''}</p>
              )}
              {user?.id === want.userId && want.status === 'open' && (
                <button onClick={() => handleFulfillWant(want)} className="btn-secondary h-9 px-4 text-xs tracking-widest">Mark Fulfilled</button>
              )}
            </div>
          )) : (
            <EmptyState icon={<CheckCircle2 />} title="No wants yet" message="Post the first want to start matching." compact />
          )}
          {hasMoreWants && (
            <div className="flex justify-center">
              <button onClick={loadMoreWants} disabled={loadingMoreWants} className="btn-secondary h-10 px-4 text-xs tracking-widest disabled:opacity-60">{loadingMoreWants ? 'Loading...' : 'Load More Wants'}</button>
            </div>
          )}
        </div>
      )}

      {surface === 'threads' && (
        <div className="space-y-section">
          {threads.length > 0 ? threads.map(thread => (
            <div key={thread.id} className="card-vault p-padding space-y-padding">
              <div className="space-y-control">
                <h4 className="text-sm font-bold text-ink-primary">{thread.title}</h4>
                <p className="text-xs text-ink-tertiary uppercase tracking-widest">@{thread.username} · {getRelativeTime(thread.createdAt)} · {thread.commentCount} replies</p>
                {thread.body && <p className="text-sm text-ink-secondary/80">{thread.body}</p>}
                {thread.setDisplay && <p className="text-xs text-ink-tertiary">Set: {thread.setDisplay}</p>}
              </div>
              <button onClick={() => setExpandedThreadId(expandedThreadId === thread.id ? null : thread.id)} className="text-xs font-bold text-gold-500 hover:underline">{expandedThreadId === thread.id ? 'Hide Replies' : 'View Replies'}</button>
              {expandedThreadId === thread.id && (
                <div className="space-y-control border-t border-border-soft pt-control">
                  {thread.comments.length > 0 ? thread.comments.map(c => (
                    <div key={c.id} className="text-xs">
                      <span className="font-bold text-ink-primary">@{c.username}</span>
                      <span className="text-ink-tertiary"> · {getRelativeTime(c.createdAt)}</span>
                      <p className="text-ink-secondary/80 mt-1">{c.body}</p>
                    </div>
                  )) : <p className="text-xs text-ink-tertiary px-1 py-1">No replies yet.</p>}
                  {user && (
                    <div className="flex gap-control pt-control">
                      <input value={threadReplyDrafts[thread.id] || ''} onChange={(e) => setThreadReplyDrafts(prev => ({ ...prev, [thread.id]: e.target.value }))} placeholder="Reply to thread..." className="flex-1 bg-surface-base border border-border-soft rounded-xl h-9 px-3 text-xs" />
                      <button onClick={() => handleThreadReply(thread)} disabled={!(threadReplyDrafts[thread.id] || '').trim()} className="p-2 text-gold-500 disabled:opacity-30"><Send size={16} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <EmptyState icon={<MessageSquare />} title="No threads yet" message="Start the first release discussion." compact />
          )}
          {hasMoreThreads && (
            <div className="flex justify-center">
              <button onClick={loadMoreThreads} disabled={loadingMoreThreads} className="btn-secondary h-10 px-4 text-xs tracking-widest disabled:opacity-60">{loadingMoreThreads ? 'Loading...' : 'Load More Threads'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TagPicker = ({ value, onChange }: { value: PostTag; onChange: (val: PostTag) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value as PostTag)} className="bg-transparent text-xs font-bold uppercase text-gold-500 outline-none cursor-pointer">
    <option value="General">General</option>
    <option value="Pickup">Pickup</option>
    <option value="PC Update">PC Update</option>
    <option value="Show Coverage">Show Coverage</option>
  </select>
);

const SurfaceButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-4 h-9 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-widest border transition-all ${active ? 'bg-ink-primary text-gold-500 border-ink-primary' : 'bg-surface-elevated text-ink-tertiary border-border-soft hover:border-ink-secondary/20'}`}>
    {children}
  </button>
);

const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-4 h-9 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-widest border transition-all ${active ? 'bg-ink-primary text-gold-500 border-ink-primary' : 'bg-surface-elevated text-ink-tertiary border-border-soft hover:border-ink-secondary/20'}`}>
    {children}
  </button>
);

const ActionButton = ({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) => (
  <button onClick={onClick} className={`flex items-center gap-control text-ink-secondary/60 transition-colors ${color}`}>
    {icon}
    <span className="text-xs font-bold tabular">{label}</span>
  </button>
);

const getTagColor = (tag: PostTag) => {
  switch (tag) {
    case 'Pickup': return 'bg-gold-500/10 text-gold-500';
    case 'PC Update': return 'bg-success/10 text-success';
    case 'Show Coverage': return 'bg-gold-500/10 text-gold-500';
    default: return 'bg-surface-elevated text-ink-tertiary';
  }
};

export default Feed;















