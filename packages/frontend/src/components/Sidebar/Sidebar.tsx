import { useState } from 'react';
import { useAuth, GmailAccount } from '../../hooks/useAuth';

// Icons
function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="currentColor"/>
    </svg>
  );
}

function IMessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.55 1.34 4.84 3.44 6.42L4 22l5.19-2.4c.92.26 1.88.4 2.81.4 5.52 0 10-3.82 10-8.5S17.52 2 12 2zm0 15c-.88 0-1.73-.13-2.53-.36l-.57-.17-2.9 1.34.7-2.14-.44-.38C4.89 14.01 4 12.34 4 10.5 4 6.92 7.58 4 12 4s8 2.92 8 6.5-3.58 6.5-8 6.5z" fill="currentColor"/>
    </svg>
  );
}

function ClayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="3" fill="currentColor"/>
      <circle cx="5" cy="19" r="3" fill="currentColor"/>
      <circle cx="19" cy="19" r="3" fill="currentColor"/>
      <path d="M12 8v4M8.5 16.5l2-2M15.5 16.5l-2-2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function DriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M8.5 3L3 14l3.5 6h11L21 14 15.5 3h-7zm0 2h7l4 8h-7l-4-8zM5.5 14l3-6 3 6H5.5z" fill="currentColor"/>
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 3v3M15 3v3" stroke="currentColor" strokeWidth="2"/>
      <rect x="7" y="12" width="3" height="3" fill="currentColor"/>
      <rect x="14" y="12" width="3" height="3" fill="currentColor"/>
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className, expanded }: { className?: string; expanded: boolean }) {
  return (
    <svg className={`${className} transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

interface ConnectorDef {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
}

interface EmailAccountItemProps {
  account: GmailAccount;
  onDisconnect: (email: string) => void;
}

function EmailAccountItem({ account, onDisconnect }: EmailAccountItemProps) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded text-[11px] group">
      <span className="text-oscar-500 truncate flex-1">{account.email}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDisconnect(account.email);
        }}
        className="text-oscar-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
        title="Disconnect"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

export function Sidebar() {
  const { isAuthenticated, accounts, login, logout, disconnectAccount, isLoading } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const connectors: ConnectorDef[] = [
    { name: 'Gmail', icon: <GmailIcon className="w-4 h-4" />, connected: isAuthenticated },
    // { name: 'Drive', icon: <DriveIcon className="w-4 h-4" />, connected: isAuthenticated },
    // { name: 'Calendar', icon: <CalendarIcon className="w-4 h-4" />, connected: isAuthenticated },
    // { name: 'iMessage', icon: <IMessageIcon className="w-4 h-4" />, connected: true },
    // { name: 'Clay', icon: <ClayIcon className="w-4 h-4" />, connected: true },
  ];

  return (
    <aside className="w-56 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-oscar-200/50 flex flex-col overflow-hidden">
      {/* Logo area */}
      <div className="px-4 py-3.5 border-b border-oscar-100">
        <div className="flex items-center gap-2">
          <img src="/panda.png" alt="Oscar" className="w-6 h-6" />
          <span className="text-xs font-semibold text-oscar-700 tracking-tight">Connectors</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-oscar-400 hover:text-oscar-600 transition-colors"
          >
            <ChevronIcon className="w-3.5 h-3.5" expanded={expanded} />
          </button>
        </div>
      </div>

      {/* Connector List */}
      {expanded && (
        <div className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {connectors.map((c) => (
            <div key={c.name}>
              <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 ${
                c.connected
                  ? 'text-oscar-700'
                  : 'text-oscar-400'
              }`}>
                <div className={`w-7 h-7 flex items-center justify-center rounded-lg ${
                  c.connected
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-oscar-50 text-oscar-400'
                }`}>
                  {c.icon}
                </div>
                <span className="text-[13px] font-medium flex-1">{c.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  c.connected ? 'bg-emerald-400' : 'bg-oscar-200'
                }`} />
              </div>

              {/* Gmail sub-items */}
              {c.name === 'Gmail' && (
                <div className="ml-10 mt-0.5 space-y-0.5">
                  {accounts.map((account) => (
                    <EmailAccountItem
                      key={account.email}
                      account={account}
                      onDisconnect={disconnectAccount}
                    />
                  ))}
                  <button
                    onClick={login}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-[11px] text-oscar-400 hover:text-oscar-600 transition-colors px-2 py-0.5"
                  >
                    <PlusIcon className="w-3 h-3" />
                    <span>Add account</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {isAuthenticated && (
        <div className="px-4 py-3 border-t border-oscar-100">
          <button
            onClick={logout}
            disabled={isLoading}
            className="text-[11px] text-oscar-400 hover:text-oscar-600 transition-colors"
          >
            Disconnect all
          </button>
        </div>
      )}
    </aside>
  );
}
