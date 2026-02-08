import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import FileTree from '../FileTree/FileTree';
import LatexEditor from '../Editor/LatexEditor';
import PdfPreview from '../PdfPreview/PdfPreview';
import ChatPanel from '../Chat/ChatPanel';

export default function MainLayout() {
  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <PanelGroup direction="vertical">
        <Panel defaultSize={75} minSize={30}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={18} minSize={12} maxSize={40}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                <FileTree />
              </div>
            </Panel>

            <PanelResizeHandle className="resize-handle-h" />

            <Panel defaultSize={82} minSize={30}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={52} minSize={20}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <LatexEditor />
                  </div>
                </Panel>

                <PanelResizeHandle className="resize-handle-h" />

                <Panel defaultSize={48} minSize={20}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <PdfPreview />
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="resize-handle-v" />

        <Panel defaultSize={25} minSize={10} maxSize={50}>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)' }}>
            <ChatPanel />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
