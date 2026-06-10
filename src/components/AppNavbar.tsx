import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Database, Home, LogIn, LogOut, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinkClass = (path: string) =>
    cn(
      'text-sm font-medium transition-colors hover:text-primary',
      location.pathname === path ? 'text-primary' : 'text-muted-foreground',
    );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-primary">
            Medipal
          </Link>
          <Link to="/" className={navLinkClass('/')}>
            <span className="inline-flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              Home
            </span>
          </Link>
          <Link to="/chat" className={navLinkClass('/chat')}>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              Chat
            </span>
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className={navLinkClass('/admin')}>
              <span className="inline-flex items-center gap-1.5">
                <Database className="h-4 w-4" />
                Data Ingestion
              </span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="medical" size="sm" asChild>
              <Link to="/login">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
