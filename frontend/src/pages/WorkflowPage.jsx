import NLInputBar from '../components/shared/NLInputBar';
import DAGCanvas from '../components/dag/DAGCanvas';
import RightPanel from '../components/rightpanel/RightPanel';

/**
 * Main workflow page — NLInputBar + DAGCanvas + RightPanel.
 */
export default function WorkflowPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden" id="workflow-page">
      {/* Input area */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <NLInputBar />
      </div>

      {/* Canvas + Right Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <DAGCanvas />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
