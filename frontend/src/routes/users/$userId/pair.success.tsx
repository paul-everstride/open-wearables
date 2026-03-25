import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, ArrowRight, ExternalLink } from 'lucide-react';
import { useOAuthProviders } from '@/hooks/api/use-oauth-providers';
import { API_CONFIG } from '@/lib/api/config';
import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export const Route = createFileRoute('/users/$userId/pair/success')({
  component: PairSuccessPage,
  validateSearch: (search: Record<string, unknown>) => ({
    provider: (search.provider as string) || undefined,
    redirect_url: (search.redirect_url as string) || undefined,
  }),
});

function PairSuccessPage() {
  const { userId } = Route.useParams();
  const { provider: providerId, redirect_url: redirectUrl } = Route.useSearch();

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.connections.all(userId),
      refetchType: 'all',
    });
  }, [userId]);

  const { data: providers } = useOAuthProviders(true, true);
  const provider = providerId
    ? providers?.find((p) => p.provider === providerId)
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <span className="text-base font-semibold text-slate-900 tracking-tight">Everstride</span>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">Athlete Setup</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 pt-16 pb-12 flex flex-col items-center">
        {/* Success Icon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 relative"
        >
          <div className="relative flex items-center justify-center h-24 w-24 bg-white border border-slate-200 rounded-full shadow-sm">
            <div className="absolute inset-0 rounded-full border border-emerald-200 animate-[pulse-ring_2s_cubic-bezier(0.24,0,0.38,1)_infinite]" />
            <Check className="w-10 h-10 text-emerald-500 stroke-[2.5]" />
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="text-center space-y-3 mb-10 w-full"
        >
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Successfully connected
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            {provider
              ? `Your ${provider.name} device is now linked and syncing data.`
              : 'Your device is now linked and syncing data.'}
          </p>
        </motion.div>

        {/* Connected Device Card */}
        {provider && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-8 flex items-center gap-4"
          >
            <div className="flex items-center justify-center h-12 w-12 bg-slate-100 rounded-xl shrink-0">
              <img
                src={
                  provider.icon_url
                    ? `${API_CONFIG.baseUrl}${provider.icon_url}`
                    : ''
                }
                alt={`${provider.name} logo`}
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-900">
                {provider.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-slate-500">Active</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="w-full space-y-3"
        >
          {redirectUrl && (
            <a
              href={redirectUrl}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Back to the app
              <ExternalLink className="w-4 h-4 stroke-[1.5]" />
            </a>
          )}

          <a
            href={`/users/${userId}/pair${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
            className={`w-full py-3 px-4 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
              redirectUrl
                ? 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                : 'bg-slate-900 hover:bg-slate-700 text-white'
            }`}
          >
            Connect another device
            {!redirectUrl && <ArrowRight className="w-4 h-4 stroke-[1.5]" />}
          </a>
        </motion.div>
      </div>

      {/* Pulse ring animation keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.8);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </div>
  );
}
