import { MessageSquare, Terminal } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import ChatPanel from '../Chat/ChatPanel';
import CompilationOutput from '../CompilationOutput/CompilationOutput';

export default function BottomPanel() {
  const tab = useAppStore((s) => s.bottomPanelTab);
  const setTab = useAppStore((s) => s.setBottomPanelTab);
  const lastCompilation = useAppStore((s) => s.lastCompilation);
  const errorCount = lastCompilation?.errors?.length ?? 0;

  return (
    <>
      <div className="tab-bar">
        <button
          className={`tab-button ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >
          <MessageSquare size={13} />
          AI Assistant
        </button>
        <button
          className={`tab-button ${tab === 'output' ? 'active' : ''}`}
          onClick={() => setTab('output')}
        >
          <Terminal size={13} />
          Output
          {errorCount > 0 && (
            <span className="tab-badge">{errorCount}</span>
          )}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, display: tab === 'chat' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}>
          <ChatPanel />
        </div>
        <div style={{ flex: 1, display: tab === 'output' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}>
          <CompilationOutput />
        </div>
      </div>
    </>
  );
}
