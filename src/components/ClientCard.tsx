import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isPast } from "date-fns";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  payment_method: string | null;
  monthly_rate: number | null;
  last_payment_date: string | null;
  next_expected_payment_date: string | null;
}

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

const ClientCard = ({ client, onClick }: ClientCardProps) => {
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchTaskCount = async () => {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .neq("status", "done");

      if (!error && count !== null) {
        setTaskCount(count);
      }
    };

    fetchTaskCount();
  }, [client.id]);

  const getPaymentMethodColor = (method: string | null) => {
    switch (method) {
      case "check":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "quickbooks":
        return "bg-category-personal/10 text-category-personal border-category-personal/20";
      case "stripe":
        return "bg-category-idea/10 text-category-idea border-category-idea/20";
      case "direct_deposit":
        return "bg-category-client/10 text-category-client border-category-client/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const isOverdue =
    client.next_expected_payment_date &&
    isPast(new Date(client.next_expected_payment_date));

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">{client.name}</h3>
            {client.payment_method && (
              <Badge
                variant="outline"
                className={`lowercase ${getPaymentMethodColor(client.payment_method)}`}
              >
                {client.payment_method.replace("_", " ")}
              </Badge>
            )}
          </div>

          {client.monthly_rate && (
            <div>
              <p className="text-2xl font-bold text-accent">
                ${client.monthly_rate.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground lowercase">
                monthly rate
              </p>
            </div>
          )}

          <div className="space-y-1 text-sm">
            {client.last_payment_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground lowercase">
                  last payment:
                </span>
                <span>{format(new Date(client.last_payment_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {client.next_expected_payment_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground lowercase">
                  next payment:
                </span>
                <span className={isOverdue ? "text-destructive font-medium" : ""}>
                  {format(new Date(client.next_expected_payment_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          {taskCount > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground lowercase">
                {taskCount} active {taskCount === 1 ? "task" : "tasks"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientCard;
