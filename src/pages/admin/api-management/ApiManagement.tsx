import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Key, Activity, ShieldCheck, Server, Send, Settings2 } from 'lucide-react';
import ApiKeys from './ApiKeys';
import ApiEndpoints from './ApiEndpoints';
import ApiLogs from './ApiLogs';
import AutoApiConfig from './AutoApiConfig';
import AdvancedControl from './AdvancedControl';

export default function ApiManagement() {
  const [activeTab, setActiveTab] = useState('modules');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pt-4 pb-20">
      <Card className="border-none shadow-lg bg-primary text-white overflow-hidden relative rounded-[2.5rem] shrink-0">
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center shrink-0">
              <Server className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">API Management</h1>
              <p className="text-sm opacity-80 font-medium">Expose, secure, and monitor system data via API Gateway</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
      </Card>

      <Tabs defaultValue="modules" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="modules" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Database className="w-4 h-4 mr-2" />
            Module APIs
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Activity className="w-4 h-4 mr-2" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings2 className="w-4 h-4 mr-2" />
            Advanced Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-0 space-y-4">
          <AutoApiConfig />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-0 space-y-4">
          <ApiLogs />
        </TabsContent>

        <TabsContent value="advanced" className="mt-0 space-y-4">
          <AdvancedControl />
        </TabsContent>
      </Tabs>
    </div>
  );
}
