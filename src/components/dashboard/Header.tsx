interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  return (
    <header
      className={`fixed right-0 top-0 z-30 flex h-16 items-center justify-end border-b border-border bg-card/80 px-6 backdrop-blur-sm transition-all duration-300 ${
        sidebarCollapsed ? "left-16" : "left-64"
      }`}
    />
  );
}
