import { Link, useLocation } from "react-router-dom";
import { Code2, MessageSquare, History, Activity } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Code2 },
  { path: "/ask", label: "Ask", icon: MessageSquare },
  { path: "/history", label: "History", icon: History },
  { path: "/status", label: "Status", icon: Activity },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2 font-mono font-bold text-lg">
            <Code2 className="h-5 w-5 text-primary" />
            <span className="text-gradient">CodeQA</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
