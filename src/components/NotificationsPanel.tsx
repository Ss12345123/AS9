import { NotificationItem } from '../types';
import { Bell, Check, Trash2, MailOpen, AlertTriangle, Cpu, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsPanelProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationsPanel({
  notifications,
  onMarkAsRead,
  onClearAll,
  onMarkAllAsRead
}: NotificationsPanelProps) {
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'news':
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case 'ai':
        return <Cpu className="h-4 w-4 text-[#D1A12C]" />;
      case 'signal':
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case 'tp_sl':
        return <Info className="h-4 w-4 text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-[#D1A12C]" />
            <span>Secure Notification Feed</span>
          </h1>
          <p className="text-xs text-neutral-400">System diagnostic notifications, regulatory feeds, and real-time trade hits.</p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-900 border border-neutral-800 hover:border-amber-500/20 text-neutral-300 hover:text-white rounded-xl transition-all"
            >
              <MailOpen className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-900 border border-neutral-800 hover:border-red-500/20 text-neutral-300 hover:text-rose-400 rounded-xl transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Feed List */}
      <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-5 space-y-4">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-xs">
            Your secure communication channel has no active messages.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-4 relative overflow-hidden ${
                    notif.read 
                      ? 'bg-neutral-950/20 border-neutral-900/60' 
                      : 'bg-[#12110D]/30 border-amber-500/15 shadow-sm'
                  }`}
                >
                  {/* Left accent bar for unread */}
                  {!notif.read && (
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500"></div>
                  )}

                  {/* Icon */}
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    notif.type === 'news' 
                      ? 'bg-rose-500/5 border border-rose-500/10' 
                      : notif.type === 'signal'
                      ? 'bg-emerald-500/5 border border-emerald-500/10'
                      : 'bg-neutral-900 border border-neutral-850'
                  }`}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs uppercase tracking-wider font-bold ${notif.read ? 'text-neutral-400' : 'text-white'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(notif.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Mark as read action */}
                  {!notif.read && (
                    <button
                      onClick={() => onMarkAsRead(notif.id)}
                      className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 text-neutral-400 hover:text-amber-500 transition-all shrink-0 mt-0.5"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
