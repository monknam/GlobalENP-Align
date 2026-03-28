import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Users } from "lucide-react";
import { useAuth, setRoleOverride } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function RoleSelect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const handleSelect = (role: "admin" | "leader") => {
    setRoleOverride(role);
    setLocation("/");
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--neutral-900))] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-10">
          <BrandLogo showCaption />
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-1">역할 선택</h1>
        <p className="text-sm text-[hsl(var(--neutral-400))] text-center mb-8">
          이번 세션에서 사용할 역할을 선택하세요.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelect("admin")}
            className="w-full flex items-center gap-4 p-5 rounded-xl border border-white/15 bg-white/5 hover:bg-[hsl(var(--primary-400))]/10 hover:border-[hsl(var(--primary-400))]/60 transition-all text-left group"
          >
            <div className="p-2.5 rounded-lg bg-[hsl(var(--primary-400))]/20 text-[hsl(var(--primary-400))] group-hover:bg-[hsl(var(--primary-400))]/30 transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white">관리자</p>
              <p className="text-xs text-[hsl(var(--neutral-400))] mt-0.5">시스템 전체 설정 및 구성원 운영</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect("leader")}
            className="w-full flex items-center gap-4 p-5 rounded-xl border border-white/15 bg-white/5 hover:bg-[hsl(var(--secondary-400))]/10 hover:border-[hsl(var(--secondary-400))]/60 transition-all text-left group"
          >
            <div className="p-2.5 rounded-lg bg-[hsl(var(--secondary-400))]/20 text-[hsl(var(--secondary-400))] group-hover:bg-[hsl(var(--secondary-400))]/30 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white">리더</p>
              <p className="text-xs text-[hsl(var(--neutral-400))] mt-0.5">팀 현황 조회 및 진단 결과 분석</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-[hsl(var(--neutral-600))] mt-8">
          세션이 끝나면 다시 선택할 수 있습니다.
        </p>
      </motion.div>
    </div>
  );
}
