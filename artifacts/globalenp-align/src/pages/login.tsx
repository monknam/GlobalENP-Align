import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function Login() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen flex bg-[hsl(var(--neutral-900))]">
      <div className="hidden lg:flex flex-col justify-between w-96 shrink-0 px-10 py-12 border-r border-white/10">
        <div>
          <Link href="/" className="mb-12 inline-flex">
            <BrandLogo showCaption />
          </Link>

          <h2 className="text-2xl font-bold text-white leading-snug mb-4">
            GlobalENP의 성장을<br />함께 만들어 갑니다
          </h2>
          <p className="text-[hsl(var(--neutral-400))] text-sm leading-relaxed">
            방향성, 실행력, 협업, 신뢰, 분위기를 데이터로 파악하고 진단 결과를 실제 개선 과제와 다음 행동으로 연결하고자 합니다.
            <br /><br />
            'Align'은 목표관리, 조직문화 진단, 평가를 통합해 회사의 방향성과 구성원 개인의 성장을 정렬하는 시스템입니다.
          </p>
        </div>

        <div />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-10 flex justify-center">
            <Link href="/">
              <BrandLogo compact showCaption />
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">사내 운영 시스템 로그인</h1>
          <p className="text-[hsl(var(--neutral-400))] text-sm mb-8">우리 조직의 진단과 운영 현황을 확인하세요.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--neutral-300))]">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-[hsl(var(--neutral-500))] focus:outline-none focus:border-[hsl(var(--primary-400))] focus:bg-white/15 transition-all text-sm"
                placeholder="name@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--neutral-300))]">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-[hsl(var(--neutral-500))] focus:outline-none focus:border-[hsl(var(--primary-400))] focus:bg-white/15 transition-all text-sm"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="ts-btn-primary w-full py-3 mt-2"
            >
              {isLoggingIn ? "접속 중..." : "시작하기"}
            </button>
          </form>

          <p className="text-center text-xs text-[hsl(var(--neutral-500))] mt-8">
            로컬 개발 환경에서는 테스트 계정이 기본 입력될 수 있습니다.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
