import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_EMAIL } from "@/constants/auth";

type Props = { children: React.ReactNode };

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      const isAllowed = !!email && email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
      setAllowed(isAllowed);
      if (!isAllowed && session) {
        setTimeout(() => {
          supabase.auth.signOut();
        }, 0);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email ?? null;
      const isAllowed = !!email && email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
      setAllowed(isAllowed);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!allowed) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
