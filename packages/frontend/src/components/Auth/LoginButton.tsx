import { useAuth } from '../../hooks/useAuth';

function SourceBadge({ name, connected }: { name: string; connected: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      connected
        ? 'bg-green-50 text-green-700'
        : 'bg-gray-100 text-gray-400'
    }`}>
      {name}
    </span>
  );
}

export function LoginButton() {
  const { isAuthenticated, login, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <SourceBadge name="Gmail" connected={true} />
          <SourceBadge name="iMessage" connected={true} />
          <SourceBadge name="Clay" connected={true} />
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-2"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="text-sm text-oscar-600 hover:text-oscar-700 transition-colors"
    >
      Connect Gmail
    </button>
  );
}
