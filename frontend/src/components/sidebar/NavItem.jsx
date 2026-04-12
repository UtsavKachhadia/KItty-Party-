/**
 * Single navigation item with Material icon + label.
 * @param {{ icon: string, label: string, active: boolean, onClick: () => void }} props
 */
export default function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all text-left`}
      style={{
        background: active ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
        color: active ? '#e2c47a' : '#9a9080',
        fontWeight: active ? '500' : '400',
        fontFamily: "'DM Sans', sans-serif",
        border: 'none'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(201, 168, 76, 0.06)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span className="material-symbols-outlined text-[18px]" style={{ opacity: active ? 1 : 0.6 }}>{icon}</span>
      {label}
    </button>
  );
}
