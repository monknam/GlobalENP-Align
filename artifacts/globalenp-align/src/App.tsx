import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SurveyList from "@/pages/surveys/index";
import SurveyIntro from "@/pages/surveys/intro";
import SurveyRespond from "@/pages/surveys/respond";
import SurveyEdit from "@/pages/admin/surveys/edit";
import UsersAdmin from "@/pages/admin/users";
import DepartmentsAdmin from "@/pages/admin/departments";
import ResultsDashboard from "@/pages/results/dashboard";
import RoleSelect from "@/pages/role-select";
import PerformanceList from "@/pages/admin/performance/index";
import PerformanceDetail from "@/pages/admin/performance/detail";
import EvaluationIndex from "@/pages/evaluation/index";
import EvaluationForm from "@/pages/evaluation/form";
import CommitteeReview from "@/pages/evaluation/committee";
import EvaluationResult from "@/pages/evaluation/result";
import OrgDashboard from "@/pages/org-management/dashboard";
import TORequestForm from "@/pages/org-management/to-request/FormWizard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/role-select" component={RoleSelect} />
      
      {/* Member/Shared Routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/surveys" component={SurveyList} />
      <Route path="/surveys/:id/intro" component={SurveyIntro} />
      <Route path="/surveys/:id/respond" component={SurveyRespond} />
      
      {/* Admin/Leader Routes */}
      <Route path="/admin/results" component={ResultsDashboard} />
      <Route path="/admin/surveys" component={SurveyList} /> {/* Fallback list for admin nav */}
      <Route path="/admin/surveys/:id/edit" component={SurveyEdit} />
      <Route path="/admin/users" component={UsersAdmin} />
      <Route path="/admin/departments" component={DepartmentsAdmin} />
      <Route path="/admin/performance" component={PerformanceList} />
      <Route path="/admin/performance/:cycleId" component={PerformanceList} />
      <Route path="/admin/performance/:cycleId/:evalId" component={PerformanceDetail} />

      {/* 인사평가 (GlobalENP) — 구체적 경로가 먼저 */}
      <Route path="/evaluation/form/:instanceId/:step" component={EvaluationForm} />
      <Route path="/evaluation/:cycleId/:instanceId/committee" component={CommitteeReview} />
      <Route path="/evaluation/:cycleId/:instanceId/result" component={EvaluationResult} />
      <Route path="/evaluation/:cycleId" component={EvaluationIndex} />
      <Route path="/evaluation" component={EvaluationIndex} />

      {/* TO/PO 조직 관리 */}
      <Route path="/org-management/dashboard" component={OrgDashboard} />
      <Route path="/org-management/to-request" component={TORequestForm} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
