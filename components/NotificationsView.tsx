import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Heart, MessageSquare, Ghost, CheckCircle2 } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToPost: (postId: string) => void;
  animationClass?: string;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToPost,
  animationClass
}) => {
  useEffect(() => {
    // Optional: Mark all as read when viewing?
    // For now, let the user do it manually or just mark individual ones.
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`max-w-2xl mx-auto space-y-major pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex items-center justify-between gap-padding">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tighter text-ink-primary leading-tight flex items-center gap-3">
            <Bell className="text-gold-500" size={28} />
            Notifications
          </h1>
          <p className="text-sm text-ink-tertiary font-medium">
            Stay updated with activity on your vault posts
          </p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={onMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-border-soft text-xs font-bold uppercase tracking-widest text-ink-tertiary hover:text-gold-500 hover:border-gold-500/20 transition-all active:scale-95"
          >
            <CheckCircle2 size={14} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-control">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                onMarkAsRead(notification.id);
                onNavigateToPost(notification.postId);
              }}
              className={`group p-padding rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                notification.isRead 
                  ? 'bg-surface-base border-border-soft opacity-70 hover:opacity-100' 
                  : 'bg-surface-elevated border-gold-500/20 shadow-lg shadow-gold-500/5'
              }`}
            >
              {!notification.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-500" />
              )}
              
              <div className="flex gap-padding">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  notification.type === 'like' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {notification.type === 'like' ? <Heart size={20} fill="currentColor" /> : <MessageSquare size={20} />}
                </div>
                
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-ink-primary leading-snug">
                    <span className="font-bold">{notification.fromUsername}</span>
                    {' '}
                    {notification.type === 'like' ? 'liked your post' : 'commented on your post'}
                  </p>
                  
                  {notification.content && (
                    <p className="text-xs text-ink-tertiary italic line-clamp-1 bg-surface-base/50 p-2 rounded-lg border border-border-soft/50">
                      "{notification.content}"
                    </p>
                  )}
                  
                  <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest pt-1">
                    {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-padding bg-surface-elevated rounded-3xl border border-dashed border-border-soft">
          <div className="w-16 h-16 rounded-full bg-surface-base flex items-center justify-center text-ink-tertiary/20">
            <Ghost size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-ink-primary">All quiet in the vault</h3>
            <p className="text-sm text-ink-tertiary max-w-xs mx-auto">
              When other collectors interact with your posts, you'll see them here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
