import { createContext, useContext, useState } from "react";
import { getSession, setSession, clearSession } from "@/lib/AuthSession";
import { base44 } from "@/api/base44Client";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [member, setMember] = useState(() => getSession());

  const login = (memberData) => {
    setSession(memberData);
    setMember(memberData);
  };

  const logout = () => {
    clearSession();
    setMember(null);
    window.location.href = "/login-tim";
  };

  const refreshMember = async () => {
    if (!member?.id) return;
    try {
      const members = await base44.entities.TeamMember.list();
      const updated = members.find((m) => m.id === member.id);
      if (updated) {
        setSession(updated);
        setMember(updated);
      }
    } catch {}
  };

  return (
    <SessionContext.Provider value={{ member, login, logout, refreshMember }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
};