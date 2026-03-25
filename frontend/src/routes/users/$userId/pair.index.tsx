import { createFileRoute } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  Check,
  AlertCircle,
  X,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOAuthConnect } from '@/hooks/use-oauth-connect';
import { useOAuthProviders } from '@/hooks/api/use-oauth-providers';
import { useUserConnections } from '@/hooks/api/use-health';
import { useMemo } from 'react';
import { API_CONFIG } from '@/lib/api/config';

export const Route = createFileRoute('/users/$userId/pair/')({
  component: PairWearablePage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_url:
      typeof search.redirect_url === 'string' && search.redirect_url.length > 0
        ? search.redirect_url
        : undefined,
  }),
});

function PairWearablePage() {
  const { userId } = Route.useParams();
  const { redirect_url: redirectUrl } = Route.useSearch();

  const { connectionState, connectingProvider, error, connect, reset } =
    useOAuthConnect({ userId, redirectUrl });

  const { data: apiProviders, isLoading } = useOAuthProviders(true, true);
  const { data: connections } = useUserConnections(userId);

  const connectedProviders = useMemo(() => {
    if (!connections) return new Set<string>();
    return new Set(
      connections.filter((c) => c.status === 'active').map((c) => c.provider)
    );
  }, [connections]);

  const displayProviders = useMemo(() => {
    if (!apiProviders) return [];
    return apiProviders.map((apiProvider) => {
      return {
        id: apiProvider.provider,
        name: apiProvider.name,
        description: 'Connect your device',
        logoPath: apiProvider.icon_url
          ? `${API_CONFIG.baseUrl}${apiProvider.icon_url}`
          : '',
        isAvailable: apiProvider.is_enabled,
        isConnected: connectedProviders.has(apiProvider.provider),
      };
    });
  }, [apiProviders, connectedProviders]);

  const connectingProviderData = connectingProvider
    ? displayProviders.find((p) => p.id === connectingProvider)
    : null;

  const handleConnect = (providerId: string) => {
    if (connectingProvider === null) {
      connect(providerId);
    }
  };

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

      {/* Hero intro */}
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
          Connect your device
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Choose your wearable below to start syncing your recovery, sleep, and readiness data with your coach. This only takes a minute.
        </p>
      </div>

      {/* Error notification */}
      <AnimatePresence>
        {connectionState === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto px-6 mb-4"
          >
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <Button
                variant="destructive"
                size="icon"
                onClick={reset}
                aria-label="Dismiss error"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider cards */}
      <div className="max-w-2xl mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          {connectionState === 'idle' && (
            <motion.div
              key="providers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 gap-4"
            >
              {isLoading ? (
                <div className="col-span-2 flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : (
                displayProviders
                  .filter((p) => p.isAvailable)
                  .map((provider, index) => (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 ${
                        provider.isConnected
                          ? 'border-emerald-200'
                          : 'border-slate-200 hover:shadow-md hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-4 p-8">
                        {/* Provider logo */}
                        <div className="flex items-center justify-center h-20 w-20 bg-slate-100 rounded-2xl shrink-0">
                          <img
                            src={provider.logoPath}
                            alt={`${provider.name} logo`}
                            className="w-12 h-12 object-contain"
                          />
                        </div>

                        {/* Text */}
                        <div className="text-center">
                          <p className="text-slate-900 font-semibold text-base">
                            {provider.name}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            {provider.description}
                          </p>
                        </div>

                        {/* Action */}
                        {provider.isConnected ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-1.5 text-xs font-medium">
                            <Check className="w-3.5 h-3.5" />
                            Connected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConnect(provider.id)}
                            disabled={connectingProvider !== null}
                            className="w-full inline-flex items-center justify-center gap-1 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Connect
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
              )}
            </motion.div>
          )}

          {connectionState === 'connecting' && connectingProviderData && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div
                role="status"
                aria-live="polite"
                aria-label={`Connecting to ${connectingProviderData.name}`}
                className="w-12 h-12 mx-auto mb-4 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin"
              />
              <p className="text-slate-500 text-sm">
                Connecting to {connectingProviderData.name}...
              </p>
            </motion.div>
          )}

          {connectionState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 12,
                  delay: 0.1,
                }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Connected</h2>
              <p className="text-slate-500 text-sm mb-6">
                Your device will start syncing shortly
              </p>
              <button
                onClick={reset}
                className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
              >
                Connect another device
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Security */}
      <div className="max-w-2xl mx-auto px-6 pb-8 flex items-center gap-2 text-slate-400 text-xs">
        <Lock className="w-3.5 h-3.5 stroke-[1.5]" />
        <span>Your data is encrypted and secure</span>
      </div>
    </div>
  );
}
