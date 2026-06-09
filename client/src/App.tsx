import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ContratosCompra from "./pages/ContratosCompra";
import ContratosVenda from "./pages/ContratosVenda";
import Operacoes from "./pages/Operacoes";
import Classificadores from "./pages/Classificadores";
import Embarques from "./pages/Embarques";
import Descargas from "./pages/Descargas";
import Pagamentos from "./pages/Pagamentos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contratos-compra" component={ContratosCompra} />
        <Route path="/contratos-venda" component={ContratosVenda} />
        <Route path="/operacoes" component={Operacoes} />
        <Route path="/classificadores" component={Classificadores} />
        <Route path="/embarques" component={Embarques} />
        <Route path="/descargas" component={Descargas} />
        <Route path="/pagamentos" component={Pagamentos} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/configuracoes" component={Configuracoes} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
