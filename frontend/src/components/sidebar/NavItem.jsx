/**
 * Single navigation item with Material icon + label.
 * @param {{ icon: string, label: string, active: boolean, onClick: () => void }} props
 */
export default function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors text-left ${
        active
          ? 'border-l-2 border-primary bg-surface-container-highest text-on-surface font-medium'
          : 'text-on-surface-variant hover:bg-surface-container-highest border-l-2 border-transparent'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </button>
  );
}
