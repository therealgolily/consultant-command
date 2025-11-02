import { supabase } from "@/integrations/supabase/client";
import { format, isToday, getDay, getDate, getDaysInMonth } from "date-fns";

export interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  category: string | null;
  priority: string;
  status: string; // The bucket where instances should be created
  recurrence_rule: string;
  is_paused: boolean;
  time_block_start: string | null;
  time_block_end: string | null;
}

const LAST_RUN_KEY = "recurring_task_engine_last_run";

export async function runRecurringTaskEngine(): Promise<number> {
  try {
    // Check if engine should run
    const lastRun = localStorage.getItem(LAST_RUN_KEY);
    const lastRunDate = lastRun ? new Date(lastRun) : null;
    
    // Only run if last run was yesterday or earlier, or never run
    if (lastRunDate && isToday(lastRunDate)) {
      return 0;
    }

    // Fetch all active recurring tasks
    const { data: recurringTasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_recurring", true)
      .eq("is_paused", false);

    if (error) throw error;
    if (!recurringTasks || recurringTasks.length === 0) {
      localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
      return 0;
    }

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    let instancesCreated = 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    for (const task of recurringTasks) {
      // Check if pattern matches today
      if (!shouldCreateInstance(task.recurrence_rule, today)) {
        continue;
      }

      // Check if instance already exists for today
      const { data: existingInstances } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_task_id", task.id)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`);

      if (existingInstances && existingInstances.length > 0) {
        continue; // Instance already exists
      }

      // Create new instance
      const { error: insertError } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        client_id: task.client_id,
        category: task.category,
        priority: task.priority,
        status: task.status, // Use the bucket from parent
        parent_task_id: task.id,
        is_recurring: false,
        time_block_start: task.time_block_start,
        time_block_end: task.time_block_end,
      });

      if (!insertError) {
        instancesCreated++;
      }
    }

    // Update last run timestamp
    localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
    return instancesCreated;
  } catch (error) {
    console.error("Recurring task engine error:", error);
    return 0;
  }
}

function shouldCreateInstance(recurrenceRule: string, date: Date): boolean {
  if (!recurrenceRule) return false;

  const [frequency, ...params] = recurrenceRule.split("-");

  switch (frequency) {
    case "daily":
      return true;

    case "weekly": {
      const dayName = params[0]?.toLowerCase();
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const targetDay = dayMap[dayName];
      return getDay(date) === targetDay;
    }

    case "monthly": {
      const dayOfMonth = params[0];
      if (dayOfMonth === "last") {
        const daysInMonth = getDaysInMonth(date);
        return getDate(date) === daysInMonth;
      }
      const targetDate = parseInt(dayOfMonth, 10);
      return getDate(date) === targetDate;
    }

    default:
      return false;
  }
}

export function getRecurrenceLabel(recurrenceRule: string): string {
  if (!recurrenceRule) return "";

  const [frequency, ...params] = recurrenceRule.split("-");

  switch (frequency) {
    case "daily":
      return "Every day";

    case "weekly": {
      const day = params[0];
      return `Every ${day?.charAt(0).toUpperCase()}${day?.slice(1)}`;
    }

    case "monthly": {
      const dayOfMonth = params[0];
      if (dayOfMonth === "last") {
        return "Last day of each month";
      }
      const ordinal =
        dayOfMonth === "1"
          ? "1st"
          : dayOfMonth === "2"
          ? "2nd"
          : dayOfMonth === "3"
          ? "3rd"
          : `${dayOfMonth}th`;
      return `${ordinal} of each month`;
    }

    default:
      return recurrenceRule;
  }
}
