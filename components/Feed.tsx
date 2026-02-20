import React, { useState, useEffect, useRef } from 'react';
import { SocialPost, PostTag, User, ViewMode, SocialComment } from '../types';
import { MessageSquare, Heart, Share2, ImageIcon, Send, X, Loader2, Ghost } from 'lucide-react';
import { vaultStorage } from '../services/storage';

interface FeedProps {
  user: User | null;
  onNavigate: (view: ViewMode) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  animationClass?: string;
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

const Feed: React.FC<FeedProps> = ({ user, onNavigate, onToast, animationClass }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<PostTag>('General');
  const [activeFilter, setActiveFilter] = useState<'All' | PostTag>('All');
  const [isPosting, setIsPosting] = useState(false);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setIsRefreshing(true);
    const data = await vaultStorage.getPosts();
    if (data.length === 0) {
      const mockPosts: SocialPost[] = [
        {
          id: '1',
          userId: 'u1',
          username: 'SakaPC_07',
          content: 'Just secured the 2024 Prizm Silver Refractor of the Starboy! The collection is nearly complete. #Arsenal #Saka',
          tag: 'Pickup',
          likes: ['u2'],
          commentCount: 5,
          createdAt: Date.now() - 3600000,
          imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e3adbb17c1?auto=format&fit=crop&q=80&w=400',
          comments: []
        },
        {
          id: '2',
          userId: 'u2',
          username: 'PalaceVault',
          content: 'Great session at the London Card Show today. Met some fantastic collectors. The UK scene is growing so fast!',
          tag: 'Show Coverage',
          likes: ['u1'],
          commentCount: 2,
          createdAt: Date.now() - 7200000,
          comments: []
        }
      ];
      setPosts(mockPosts);
    } else {
      setPosts(data);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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
    await vaultStorage.toggleLike(postId, user.id);
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = p.likes.includes(user.id);
        const newLikes = isLiked ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id];
        return { ...p, likes: newLikes };
      }
      return p;
    }));
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

    await vaultStorage.addComment(postId, newComment);
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const updatedComments = [...(p.comments || []), newComment];
        return { ...p, comments: updatedComments, commentCount: updatedComments.length };
      }
      return p;
    }));
    setCommentText('');
  };

  const handleShare = async (post: SocialPost) => {
    const shareData = {
      title: 'TC Vault Collector Post',
      text: post.content,
      url: `${window.location.origin}/post/${post.id}`
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
    <div className={`space-y-12 max-w-2xl mx-auto pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Community Pulse</span>
          <h2 className="text-[32px] font-black tracking-tighter text-[#1a1408] leading-tight">Global Feed</h2>
        </div>
        {!user ? (
          <button onClick={() => onNavigate(ViewMode.SETTINGS)} className="btn-primary uppercase text-[10px] tracking-widest">Join to Post</button>
        ) : (
          <button onClick={fetchPosts} className={`p-2 text-stone-400 hover:text-[#c9a227] transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
            <Ghost size={20} />
          </button>
        )}
      </div>

      {user && (
        <form onSubmit={handlePost} className="glass rounded-[24px] p-6 space-y-4 border-black/6 shadow-2xl relative overflow-hidden">
          <textarea 
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your latest pickup or PC update..."
            className="w-full bg-black/[0.03] border border-black/6 rounded-xl p-4 text-sm font-semibold text-[#1a1408] focus:border-[#c9a227]/30 outline-none transition-all resize-none min-h-[100px] placeholder:text-stone-400"
          />
          
          {postImage && (
            <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-black/10 group bg-stone-900/5 flex items-center justify-center p-1">
              <img src={postImage} className="max-w-full max-h-full object-contain z-10" />
              <button type="button" onClick={() => setPostImage(null)} className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full hover:bg-rose-500 transition-colors z-20">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-stone-400 hover:text-[#c9a227] transition-colors">
                <ImageIcon size={20} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <div className="h-6 w-px bg-black/5 mx-1" />
              <TagPicker value={selectedTag} onChange={setSelectedTag} />
            </div>
            <button type="submit" disabled={isPosting || !newPostContent.trim()} className="btn-primary h-10 px-6 uppercase text-[10px] tracking-widest gap-2 disabled:opacity-50">
              {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
              Post
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto no-scrollbar pb-2">
        <FilterButton active={activeFilter === 'All'} onClick={() => setActiveFilter('All')}>All Activity</FilterButton>
        <FilterButton active={activeFilter === 'Pickup'} onClick={() => setActiveFilter('Pickup')}>Pickups</FilterButton>
        <FilterButton active={activeFilter === 'PC Update'} onClick={() => setActiveFilter('PC Update')}>PC Updates</FilterButton>
        <FilterButton active={activeFilter === 'Show Coverage'} onClick={() => setActiveFilter('Show Coverage')}>Events</FilterButton>
      </div>

      <div className="space-y-6">
        {filteredPosts.map(post => (
          <div key={post.id} className="glass rounded-[24px] border-black/6 overflow-hidden group hover:border-black/10 transition-all shadow-lg">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#c9a227]/10 flex items-center justify-center text-[#c9a227] font-bold italic border border-[#c9a227]/20 overflow-hidden">
                    {post.userAvatar ? <img src={post.userAvatar} className="w-full h-full object-cover" /> : post.username[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#1a1408] hover:text-[#c9a227] cursor-pointer transition-colors">@{post.username}</h4>
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
                      {getRelativeTime(post.createdAt)}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${getTagColor(post.tag)}`}>
                  {post.tag}
                </span>
              </div>

              <p className="text-sm font-semibold text-stone-700 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {post.imageUrl && (
                <div className="rounded-[24px] overflow-hidden bg-stone-900/5 border border-black/6 shadow-inner relative group/image">
                  <img 
                    src={post.imageUrl} 
                    className="max-w-full h-auto max-h-[70vh] block mx-auto object-contain bg-stone-50/50" 
                    alt="Post attachment" 
                  />
                  <div className="absolute inset-0 bg-stone-900/5 pointer-events-none opacity-0 group-hover/image:opacity-100 transition-opacity"></div>
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <ActionButton 
                  icon={<Heart size={18} className={user && post.likes.includes(user.id) ? 'fill-rose-500 text-rose-500' : ''} />} 
                  label={post.likes.length.toString()} 
                  color={user && post.likes.includes(user.id) ? 'text-rose-500' : 'hover:text-rose-500'} 
                  onClick={() => toggleLike(post.id)}
                />
                <ActionButton 
                  icon={<MessageSquare size={18} />} 
                  label={post.commentCount.toString()} 
                  color="hover:text-[#c9a227]" 
                  onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                />
                <ActionButton icon={<Share2 size={18} />} label="" color="hover:text-emerald-500" onClick={() => handleShare(post)} />
              </div>

              {expandedComments === post.id && (
                <div className="pt-6 border-t border-black/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-4 max-h-64 overflow-y-auto no-scrollbar">
                    {(post.comments || []).map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold italic shrink-0">
                          {comment.userAvatar ? <img src={comment.userAvatar} className="w-full h-full rounded-full object-cover" /> : comment.username[0]}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[11px] font-black text-[#1a1408]">@{comment.username}</h5>
                            <span className="text-[9px] font-semibold text-stone-400 uppercase">{getRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-xs text-stone-600 font-medium leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {(post.comments || []).length === 0 && (
                      <p className="text-center text-[10px] font-black text-stone-300 uppercase tracking-widest py-4">No comments yet</p>
                    )}
                  </div>

                  {user && (
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                        className="flex-1 bg-black/[0.03] border border-black/5 rounded-xl h-10 px-4 text-xs font-semibold focus:border-[#c9a227]/30 outline-none text-[#1a1408]"
                      />
                      <button 
                        onClick={() => handleComment(post.id)}
                        disabled={!commentText.trim()}
                        className="p-2 text-[#c9a227] hover:text-[#c9a227]/80 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TagPicker = ({ value, onChange }: { value: PostTag; onChange: (val: PostTag) => void }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Tag:</span>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value as PostTag)}
      style={{ colorScheme: 'light' }}
      className="bg-transparent text-[10px] font-black uppercase text-[#c9a227] outline-none cursor-pointer hover:text-[#c9a227]/80 transition-colors"
    >
      <option value="General" className="bg-white text-stone-800 font-semibold">General</option>
      <option value="Pickup" className="bg-white text-stone-800 font-semibold">Pickup</option>
      <option value="PC Update" className="bg-white text-stone-800 font-semibold">PC Update</option>
      <option value="Show Coverage" className="bg-white text-stone-800 font-semibold">Show Coverage</option>
    </select>
  </div>
);

const FilterButton = ({ active, onClick, children }: any) => (
  <button 
    onClick={onClick}
    className={`px-2 md:px-4 h-9 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-tighter md:tracking-widest border transition-all active:scale-95 ${active ? 'bg-[#1a1408] text-[#c9a227] border-[#1a1408]' : 'glass-subtle text-stone-400 border-black/10 hover:border-black/20'}`}
  >
    {children}
  </button>
);

const ActionButton = ({ icon, label, color, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 text-stone-500 transition-colors active:scale-90 ${color}`}>
    {icon}
    <span className="text-xs font-black tabular">{label}</span>
  </button>
);

const getTagColor = (tag: PostTag) => {
  switch (tag) {
    case 'Pickup': return 'bg-[#c9a227]/10 text-[#c9a227]';
    case 'PC Update': return 'bg-emerald-500/10 text-emerald-600';
    case 'Show Coverage': return 'bg-[#c9a227]/10 text-[#c9a227]';
    default: return 'bg-stone-500/10 text-stone-600';
  }
}

export default Feed;