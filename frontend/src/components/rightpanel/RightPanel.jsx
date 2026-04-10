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
      className="w-[280px] bg-surface-container-low border-l border-[0.5px] border-outline-variant/20 flex flex-col flex-shrink-0 overflow-hidden"
    >
      {/* Tab bar */}
      <div className="flex border-b border-[0.5px] border-outline-variant/20 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary hover:text-on-surface-variant'
            }`}
            id={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'steps' && <StepsTab />}
        {activeTab === 'console' && <ConsoleTab />}
        {activeTab === 'json' && <JsonTab />}
      </div>

      {/* IFR Card pinned bottom */}
      <IFRCard />
    </div>
  );
}
