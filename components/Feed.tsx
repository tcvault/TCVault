import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SocialPost, PostTag, User, ViewMode, SocialComment } from '../types';
import { MessageSquare, Heart, Share2, ImageIcon, Send, X, Loader2, RefreshCw, Trash2 } from 'lucide-react';
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
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<PostTag>('General');
  const [activeFilter, setActiveFilter] = useState<'All' | PostTag>('All');
  const [isPosting, setIsPosting] = useState(false);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchPosts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await vaultStorage.getPosts();
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      if (onToast) onToast("Failed to sync with the hobby feed.", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
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
        comments: []
      };

      await vaultStorage.savePost(newPost);
      setPosts([newPost, ...posts]);
      setNewPostContent('');
      setPostImage(null);
      setSelectedTag('General');
      if (onToast) onToast("Post published to the hobby feed!", "success");
    } catch {
      if (onToast) onToast("Post failed to publish.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (deletingPostId !== postId) {
      setDeletingPostId(postId);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setDeletingPostId(null), 3000);
      return;
    }
    
    try {
      await vaultStorage.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setDeletingPostId(null);
      if (onToast) onToast("Post deleted.", "success");
    } catch {
      if (onToast) onToast("Failed to delete post.", "error");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPostImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      onNavigate(ViewMode.SETTINGS);
      return;
    }
    try {
      await vaultStorage.toggleLike(postId, user.id);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const isLiked = p.likes.includes(user.id);
          const newLikes = isLiked ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id];
          return { ...p, likes: newLikes };
        }
        return p;
      }));
    } catch (error) {
      console.error("Like failed:", error);
      if (onToast) onToast("Failed to update like. Please try again.", "error");
    }
  };

  const handleComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    
    const newComment: SocialComment = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      content: commentText,
      createdAt: Date.now()
    };

    try {
      await vaultStorage.addComment(postId, newComment);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const updatedComments = [...(p.comments || []), newComment];
          return { ...p, comments: updatedComments, commentCount: updatedComments.length };
        }
        return p;
      }));
      setCommentText('');
    } catch (error) {
      console.error("Comment failed:", error);
      if (onToast) onToast("Failed to add comment. Please try again.", "error");
    }
  };

  const handleShare = async (post: SocialPost) => {
    const shareData = {
      title: 'TC Vault Collector Post',
      text: post.content,
      url: `${window.location.origin}?post=${post.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        if (onToast) onToast("Post link copied to clipboard!", "info");
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const filteredPosts = activeFilter === 'All' 
    ? posts 
    : posts.filter(p => p.tag === activeFilter);

  return (
    <div className={`space-y-major max-w-2xl mx-auto pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex items-end justify-between px-1 md:px-0">
        <div className="space-y-control">
          <span className="text-micro font-semibold text-ink-secondary/60 uppercase tracking-widest">Community Pulse</span>
          <h1>Global Feed</h1>
        </div>
        {!user ? (
          <button onClick={() => onNavigate(ViewMode.SETTINGS)} className="btn-primary text-xs tracking-widest">Join to Post</button>
        ) : (
          <button onClick={fetchPosts} className={`p-2 text-ink-tertiary hover:text-gold-500 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
            <RefreshCw size={20} />
          </button>
        )}
      </div>

      {user && (
        <form onSubmit={handlePost} className="card-vault space-y-padding shadow-xl relative overflow-hidden">
          <textarea 
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your latest pickup or PC update..."
            className="w-full bg-surface-base border border-border-soft rounded-xl p-padding text-sm font-semibold text-ink-primary focus:border-gold-500/30 outline-none transition-all resize-none min-h-[100px] placeholder:text-ink-tertiary"
          />
          
          {postImage && (
            <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-border-soft group bg-surface-base flex items-center justify-center p-1">
              <img src={postImage} className="max-w-full max-h-full object-contain z-10" />
              <button type="button" onClick={() => setPostImage(null)} className="absolute top-1 right-1 bg-ink-primary/60 text-white p-1.5 rounded-full hover:bg-rose-500 transition-colors z-20">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-y-padding">
            <div className="flex items-center gap-control">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-ink-tertiary hover:text-gold-500 transition-colors">
                <ImageIcon size={20} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <div className="h-6 w-px bg-border-soft mx-1" />
              <TagPicker value={selectedTag} onChange={setSelectedTag} />
            </div>
            <button type="submit" disabled={isPosting || !newPostContent.trim()} className="btn-primary h-10 px-6 text-xs tracking-widest gap-2 disabled:opacity-50 ml-auto sm:ml-0 font-bold">
              {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
              Post
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-control overflow-x-auto no-scrollbar pb-2">
        <FilterButton active={activeFilter === 'All'} onClick={() => setActiveFilter('All')}>All Activity</FilterButton>
        <FilterButton active={activeFilter === 'Pickup'} onClick={() => setActiveFilter('Pickup')}>Pickups</FilterButton>
        <FilterButton active={activeFilter === 'PC Update'} onClick={() => setActiveFilter('PC Update')}>PC Updates</FilterButton>
        <FilterButton active={activeFilter === 'Show Coverage'} onClick={() => setActiveFilter('Show Coverage')}>Events</FilterButton>
      </div>

      <div className="space-y-section">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <div 
              key={post.id} 
              ref={el => { postRefs.current[post.id] = el; }}
              className={`card-vault overflow-hidden group hover:border-gold-500/20 transition-all shadow-sm p-0 ${highlightedPostId === post.id ? 'border-gold-500 shadow-gold-500/10' : ''}`}
            >
              <div className="p-padding space-y-padding">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-control">
                    <div className="w-10 h-10 rounded-full bg-surface-base flex items-center justify-center text-gold-500 font-bold italic border border-border-soft overflow-hidden">
                      {post.userAvatar ? <img src={post.userAvatar} className="w-full h-full object-cover" /> : (post.username?.[0] || '?')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink-primary hover:text-gold-500 cursor-pointer transition-colors">@{post.username}</h4>
                      <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">
                        {getRelativeTime(post.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-control">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${getTagColor(post.tag)}`}>
                      {post.tag}
                    </span>
                    {user && post.userId === user.id && (
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className={`p-1.5 transition-all active:scale-90 flex items-center gap-2 ${deletingPostId === post.id ? 'text-error' : 'text-ink-tertiary hover:text-error'}`}
                        title={deletingPostId === post.id ? "Confirm Delete" : "Delete Post"}
                      >
                        {deletingPostId === post.id && <span className="text-xs font-bold uppercase tracking-widest">Tap to confirm</span>}
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm font-medium text-ink-secondary/80 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {post.imageUrl && (
                  <div className="rounded-xl overflow-hidden bg-surface-base border border-border-soft shadow-inner relative group/image">
                    <img 
                      src={post.imageUrl} 
                      loading="lazy"
                      className="max-w-full h-auto max-h-[70vh] block mx-auto object-contain" 
                      alt="Post attachment" 
                    />
                  </div>
                )}

                <div className="flex items-center gap-section pt-control">
                  <ActionButton 
                    icon={<Heart size={18} className={user && post.likes.includes(user.id) ? 'fill-rose-500 text-rose-500' : ''} />} 
                    label={post.likes.length.toString()} 
                    color={user && post.likes.includes(user.id) ? 'text-rose-500' : 'hover:text-rose-500'} 
                    onClick={() => toggleLike(post.id)}
                  />
                  <ActionButton 
                    icon={<MessageSquare size={18} />} 
                    label={post.commentCount.toString()} 
                    color="hover:text-gold-500" 
                    onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                  />
                  <ActionButton icon={<Share2 size={18} />} label="" color="hover:text-emerald-500" onClick={() => handleShare(post)} />
                </div>

                {expandedComments === post.id && (
                  <div className="pt-padding border-t border-border-soft space-y-padding animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-padding max-h-64 overflow-y-auto no-scrollbar">
                      {(post.comments || []).map(comment => (
                        <div key={comment.id} className="flex gap-control">
                          <div className="w-8 h-8 rounded-full bg-surface-base border border-border-soft flex items-center justify-center text-xs font-bold italic shrink-0">
                            {comment.userAvatar ? <img src={comment.userAvatar} className="w-full h-full rounded-full object-cover" /> : (comment.username?.[0] || '?')}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[11px] font-bold text-ink-primary">@{comment.username}</h5>
                              <span className="text-xs font-semibold text-ink-tertiary uppercase">{getRelativeTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-xs text-ink-secondary/80 font-medium leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      {(post.comments || []).length === 0 && (
                        <p className="text-center text-xs font-bold text-ink-tertiary uppercase tracking-widest py-padding">No comments yet</p>
                      )}
                    </div>

                    {user && (
                      <div className="flex gap-control">
                        <input 
                          type="text" 
                          placeholder="Add a comment..." 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          className="flex-1 bg-surface-base border border-border-soft rounded-xl h-10 px-padding text-xs font-semibold focus:border-gold-500/30 outline-none text-ink-primary"
                        />
                        <button 
                          onClick={() => handleComment(post.id)}
                          disabled={!commentText.trim()}
                          className="p-2 text-gold-500 hover:text-gold-500/80 disabled:opacity-30 active:scale-95 transition-all"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState 
            icon={<RefreshCw />} 
            title="The Feed is Quiet" 
            message={activeFilter === 'All' ? "Be the first to share a pickup or update with the community!" : `No posts found in the ${activeFilter} category.`}
          />
        )}
      </div>
    </div>
  );
};

const TagPicker = ({ value, onChange }: { value: PostTag; onChange: (val: PostTag) => void }) => (
  <div className="flex items-center gap-control">
    <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Tag:</span>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value as PostTag)}
      style={{ colorScheme: 'light' }}
      className="bg-transparent text-xs font-bold uppercase text-gold-500 outline-none cursor-pointer hover:text-gold-500/80 transition-colors"
    >
      <option value="General" className="bg-surface-base text-ink-primary font-semibold">General</option>
      <option value="Pickup" className="bg-surface-base text-ink-primary font-semibold">Pickup</option>
      <option value="PC Update" className="bg-surface-base text-ink-primary font-semibold">PC Update</option>
      <option value="Show Coverage" className="bg-surface-base text-ink-primary font-semibold">Show Coverage</option>
    </select>
  </div>
);

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterButton = ({ active, onClick, children }: FilterButtonProps) => (
  <button 
    onClick={onClick}
    className={`px-4 h-9 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 ${active ? 'bg-ink-primary text-gold-500 border-ink-primary' : 'bg-surface-elevated text-ink-tertiary border-border-soft hover:border-ink-secondary/20'}`}
  >
    {children}
  </button>
);

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

const ActionButton = ({ icon, label, color, onClick }: ActionButtonProps) => (
  <button onClick={onClick} className={`flex items-center gap-control text-ink-secondary/60 transition-colors active:scale-90 ${color}`}>
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
}

export default Feed;