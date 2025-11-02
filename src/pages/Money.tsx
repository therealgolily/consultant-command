import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogTab from "@/components/money/LogTab";
import ReportsTab from "@/components/money/ReportsTab";

const Money = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold lowercase mb-8">money</h1>

      <Tabs defaultValue="log">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="log" className="lowercase">
            log
          </TabsTrigger>
          <TabsTrigger value="reports" className="lowercase">
            reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <LogTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Money;
