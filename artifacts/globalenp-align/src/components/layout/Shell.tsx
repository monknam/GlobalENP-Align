import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Users,
  Users2,
  Building2,
  LogOut,
  Menu,
  X,
  BarChart3,
  Target,
  Kanban,
  Award,
  Flag,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  show: boolean;
  comingSoon?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isLeader = user.role === "admin" || user.role === "leader";

  const navSections: NavSection[] = [
    {
      items: [
        { href: "/", label: "대시보드", icon: LayoutDashboard, show: true },
      ],
    },
    {
      title: "조직진단",
      items: [
        { href: "/surveys", label: "조직 진단 설문", icon: ClipboardList, show: true },
        { href: "#", label: "진단 리포트", icon: BarChart3, show: true, comingSoon: true },
        { href: "#", label: "360도 피드백", icon: Users2, show: true, comingSoon: true },
      ],
    },
    {
      title: "성과평가",
      items: [
        { href: "/admin/performance", label: "인사평가 리뷰", icon: Award, show: isAdmin },
        { href: "#", label: "개인평가", icon: UserCheck, show: isAdmin, comingSoon: true },
      ],
    },
    {
      title: "목표정렬",
      items: [
        { href: "#", label: "조직목표", icon: Target, show: true, comingSoon: true },
        { href: "#", label: "개인목표", icon: Flag, show: true, comingSoon: true },
      ],
    },
    {
      title: "과제관리",
      items: [
        { href: "#", label: "과제관리", icon: Kanban, show: true, comingSoon: true },
      ],
    },
    {
      title: "운영 설정",
      items: [
        { href: "/admin/surveys", label: "진단 운영", icon: Settings, show: isAdmin },
        { href: "/admin/users", label: "구성원 관리", icon: Users, show: isAdmin },
        { href: "/admin/departments", label: "조직 구조 관리", icon: Building2, show: isAdmin },
      ],
    },
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/" onClick={closeMenu}>
          <BrandLogo showCaption className="align-middle" />
        </Link>
      </div>

      <nav className="flex-1 px-4 py-3 overflow-y-auto">
        {navSections
          .filter((section) => section.items.some((item) => item.show))
          .map((section, si) => (
            <div key={section.title ?? "__home__"} className={si > 0 ? "mt-1" : ""}>
              {section.title && (
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[hsl(var(--neutral-500))] px-4 pt-5 pb-1.5">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items
                  .filter((item) => item.show)
                  .map((item) => {
                    if (item.comingSoon) {
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none"
                        >
                          <item.icon className="w-4 h-4 shrink-0 text-[hsl(var(--neutral-400))]" />
                          <span className="flex-1 text-[hsl(var(--neutral-300))]">{item.label}</span>
                          <span className="text-[10px] font-semibold bg-white/10 text-white/60 px-1.5 py-0.5 rounded-sm leading-none">
                            준비 중
                          </span>
                        </div>
                      );
                    }

                    const isActive =
                      location === item.href ||
                      (item.href !== "/" && location.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-[hsl(var(--primary-400))] text-white shadow-sm"
                            : "text-[hsl(var(--neutral-300))] hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-white" : "text-[hsl(var(--neutral-400))]"
                          )}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
      </nav>

      <div className="px-4 py-5 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/8">
          <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary-400))] flex items-center justify-center font-bold text-white text-sm shrink-0">
            {user.fullName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.fullName || "사용자"}</p>
            <p className="text-xs text-[hsl(var(--neutral-400))] truncate">
              {user.role === "admin" ? "관리자" : user.role === "leader" ? "리더" : "구성원"}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[hsl(var(--neutral-400))] hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[hsl(var(--neutral-50))]">
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-[hsl(var(--neutral-900))] sticky top-0 z-40">
        <Link href="/" onClick={closeMenu}>
          <BrandLogo compact showCaption />
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white">
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <aside className="hidden md:flex w-64 shrink-0 bg-[hsl(var(--neutral-900))] flex-col sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMenu}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed top-0 left-0 z-50 h-full w-64 bg-[hsl(var(--neutral-900))] md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 min-h-screen">
        <div className="px-5 py-8 md:px-10 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
