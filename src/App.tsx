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
import UserGroups from "./pages/settings/UserGroups";

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
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/inbound" element={<InboundScripts />} />
            <Route path="/settings/outbound" element={<OutboundScripts />} />
            <Route path="/settings/forms" element={<FormsSettings />} />
            <Route path="/settings/zapier" element={<ZapierPage />} />
            <Route path="/settings/users" element={<UserGroups />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </VICIProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
