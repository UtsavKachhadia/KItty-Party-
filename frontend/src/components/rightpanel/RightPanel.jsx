import useUIStore from '../../store/uiStore';
import StepsTab from './StepsTab';
import ConsoleTab from './ConsoleTab';
import JsonTab from './JsonTab';
import IFRCard from './IFRCard';

/**
 * 280px right panel with 3 tabs: STEPS, CONSOLE, JSON.
 * IFR card pinned at the bottom.
 */
export default function RightPanel() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const tabs = ['steps', 'console', 'json'];

  return (
    <div
      id="right-panel"
      className="w-[280px] flex flex-col flex-shrink-0 overflow-hidden border-l"
      style={{ background: '#f0ece0', borderColor: '#d0c9bc' }}
    >
      {/* Tab bar */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: '#d0c9bc' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors border-b-2`}
            style={{
              borderBottomColor: activeTab === tab ? '#c9a84c' : 'transparent',
              color: activeTab === tab ? '#c9a84c' : '#7a7060',
              fontFamily: "'JetBrains Mono', monospace",
              background: 'transparent'
            }}
            id={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#f0ece0' }}>
        {activeTab === 'steps' && <StepsTab />}
        {activeTab === 'console' && <ConsoleTab />}
        {activeTab === 'json' && <JsonTab />}
      </div>

      {/* IFR Card pinned bottom */}
      <IFRCard />
    </div>
  );
}
