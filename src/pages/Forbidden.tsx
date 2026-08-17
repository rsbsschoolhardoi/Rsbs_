import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Forbidden() {
  const { profile } = useAuth();
  const getHomeLink = () => {
    if (!profile) return "/student-login";
    switch (profile.role) {
      case "admin": return "/admin";
      case "teacher": return "/teacher";
      case "parent": return "/parent/dashboard";
      default: return "/student";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 text-center">
      <div className="bg-destructive/10 p-6 rounded-full mb-6">
        <ShieldAlert className="w-16 h-16 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold mb-4">403 - Access Denied</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        You do not have permission to access this page. Please contact your system administrator or log in with the correct account.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link to={getHomeLink()}>Back to Portal Home</Link>
        </Button>
        <Button asChild>
          <Link to="/student-login">Switch Account</Link>
        </Button>
      </div>
    </div>
  );
}
