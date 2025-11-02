import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ClientCard from "@/components/ClientCard";
import AddClientModal from "@/components/AddClientModal";
import ClientDetailModal from "@/components/ClientDetailModal";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  payment_method: string | null;
  monthly_rate: number | null;
  last_payment_date: string | null;
  next_expected_payment_date: string | null;
  notes: string | null;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    const channel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center text-muted-foreground lowercase py-12">
          loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold lowercase">clients</h1>
        <Button
          onClick={handleAddClient}
          className="lowercase"
        >
          <Plus className="w-4 h-4 mr-2" />
          add client
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground lowercase mb-6">
            no clients yet. add your first client to get started.
          </p>
          <Button onClick={handleAddClient} size="lg" className="lowercase">
            <Plus className="w-5 h-5 mr-2" />
            add client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => setSelectedClient(client)}
            />
          ))}
        </div>
      )}

      <AddClientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchClients}
      />

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          open={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          onUpdate={fetchClients}
        />
      )}
    </div>
  );
};

export default Clients;
