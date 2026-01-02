import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VICIProvider } from "./contexts/VICIContext";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import InboundScripts from "./pages/settings/InboundScripts";
import OutboundScripts from "./pages/settings/OutboundScripts";
import FormsSettings from "./pages/settings/FormsSettings";
import ZapierPage from "./pages/settings/ZapierPage";
import ListIdManagement from "./pages/settings/ListIdManagement";
import MySQLPage from "./pages/settings/MySQLPage";
import ImportPage from "./pages/settings/ImportPage";
import VICISettings from "./pages/settings/VICISettings";
import { ProtectedSettingsRoute } from "./components/ProtectedSettingsRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VICIProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/settings" element={<ProtectedSettingsRoute><Settings /></ProtectedSettingsRoute>} />
            <Route path="/settings/inbound" element={<ProtectedSettingsRoute><InboundScripts /></ProtectedSettingsRoute>} />
            <Route path="/settings/outbound" element={<ProtectedSettingsRoute><OutboundScripts /></ProtectedSettingsRoute>} />
            <Route path="/settings/forms" element={<ProtectedSettingsRoute><FormsSettings /></ProtectedSettingsRoute>} />
            <Route path="/settings/listid" element={<ProtectedSettingsRoute><ListIdManagement /></ProtectedSettingsRoute>} />
            <Route path="/settings/vici" element={<ProtectedSettingsRoute><VICISettings /></ProtectedSettingsRoute>} />
            <Route path="/settings/zapier" element={<ProtectedSettingsRoute><ZapierPage /></ProtectedSettingsRoute>} />
            <Route path="/settings/mysql" element={<ProtectedSettingsRoute><MySQLPage /></ProtectedSettingsRoute>} />
            <Route path="/settings/import" element={<ProtectedSettingsRoute><ImportPage /></ProtectedSettingsRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </VICIProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
