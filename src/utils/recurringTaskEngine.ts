import { supabase } from "@/integrations/supabase/client";
import { format, getDay, getDate, getDaysInMonth, addDays, addMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

export interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  category: string | null;
  priority: string;
  recurrence_rule: string;
  is_paused: boolean;
  time_block_start: string | null;
  time_block_end: string | null;
}

const LAST_RUN_KEY = "recurring_task_engine_last_run";

/**
 * Calculate the next due date for a recurring task based on its recurrence rule
 */
function calculateNextDueDate(recurrenceRule: string, today: Date): Date | null {
  if (!recurrenceRule) return null;

  const [frequency, ...params] = recurrenceRule.split("-");

  switch (frequency) {
    case "daily":
      return today;

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
      const todayDay = getDay(today);
      
      // If today is the target day, return today
      if (todayDay === targetDay) {
        return today;
      }
      
      // Calculate days until next occurrence
      let daysUntil = targetDay - todayDay;
      if (daysUntil < 0) {
        daysUntil += 7;
      }
      
      return addDays(today, daysUntil);
    }

    case "monthly": {
      const dayOfMonth = params[0];
      const currentDate = getDate(today);
      
      if (dayOfMonth === "last") {
        // Last day of month
        const lastDayThisMonth = getDaysInMonth(today);
        
        if (currentDate <= lastDayThisMonth) {
          // If we haven't passed it this month, use this month
          const lastDay = endOfMonth(today);
          return lastDay;
        } else {
          // Otherwise, use next month
          const nextMonth = addMonths(today, 1);
          return endOfMonth(nextMonth);
        }
      } else {
        const targetDate = parseInt(dayOfMonth, 10);
        
        // Check if target date exists in current month
        const daysInCurrentMonth = getDaysInMonth(today);
        
        if (targetDate <= daysInCurrentMonth && currentDate <= targetDate) {
          // If we haven't passed it this month, use this month
          const thisMonth = startOfMonth(today);
          return new Date(thisMonth.getFullYear(), thisMonth.getMonth(), targetDate);
        } else {
          // Otherwise, use next month
          const nextMonth = addMonths(startOfMonth(today), 1);
          const daysInNextMonth = getDaysInMonth(nextMonth);
          
          // If next month doesn't have this date, use last day of next month
          const useDate = Math.min(targetDate, daysInNextMonth);
          return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), useDate);
        }
      }
    }

    default:
      return null;
  }
}

/**
 * Calculate the appropriate status based on due date relative to today
 */
function calculateStatus(dueDate: Date, today: Date): string {
  const daysUntil = differenceInDays(dueDate, today);
  
  if (daysUntil === 0) {
    return "today";
  } else if (daysUntil === 1) {
    return "tomorrow";
  } else if (daysUntil >= 2 && daysUntil <= 7) {
    return "this_week";
  } else if (daysUntil >= 8 && daysUntil <= 14) {
    return "next_week";
  } else {
    return "backburner";
  }
}

export async function runRecurringTaskEngine(): Promise<number> {
  try {
    console.log("🔄 Starting recurring task engine...");
    
    // Check if engine should run
    const lastRun = localStorage.getItem(LAST_RUN_KEY);
    const lastRunDate = lastRun ? new Date(lastRun) : null;
    
    console.log("Last run:", lastRunDate);
    
    // Always run; duplicate prevention handled per-task by checking existing instances
    console.log("🔄 Running engine check...");

    // Fetch all active recurring tasks
    const { data: recurringTasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_recurring", true)
      .eq("is_paused", false);

    if (error) {
      console.error("❌ Error fetching recurring tasks:", error);
      throw error;
    }
    
    console.log(`📋 Found ${recurringTasks?.length || 0} active recurring tasks`);
    
    if (!recurringTasks || recurringTasks.length === 0) {
      localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let instancesCreated = 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ No user found");
      return 0;
    }

    for (const task of recurringTasks) {
      console.log(`\n🔍 Processing: "${task.title}" (${task.recurrence_rule})`);
      
      // Calculate the next due date
      const dueDate = calculateNextDueDate(task.recurrence_rule, today);
      
      if (!dueDate) {
        console.warn(`⚠️ Could not calculate due date for task ${task.id}`);
        continue;
      }

      console.log(`📅 Calculated due date: ${format(dueDate, "yyyy-MM-dd")}`);

      // Only create if due date is today or in the near future (within 14 days)
      const daysUntil = differenceInDays(dueDate, today);
      console.log(`⏰ Days until due: ${daysUntil}`);
      
      if (daysUntil > 14) {
        console.log(`⏭️ Skipping - due date too far in future`);
        continue;
      }

      // Check if instance already exists for this due date
      const dueDateStr = format(dueDate, "yyyy-MM-dd");
      const { data: existingInstances, error: checkError } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_task_id", task.id)
        .eq("due_date", dueDateStr);

      if (checkError) {
        console.error("❌ Error checking existing instances:", checkError);
        continue;
      }

      if (existingInstances && existingInstances.length > 0) {
        console.log(`✓ Instance already exists for ${dueDateStr}`);
        continue;
      }

      // Calculate status based on due date
      const status = calculateStatus(dueDate, today);
      console.log(`📊 Calculated status: ${status}`);

      // Create new instance
      const instanceData = {
        user_id: user.id,
        title: task.title,
        description: task.description,
        client_id: task.client_id,
        category: task.category,
        priority: task.priority,
        status: status,
        due_date: dueDateStr,
        parent_task_id: task.id,
        is_recurring: false,
        time_block_start: task.time_block_start,
        time_block_end: task.time_block_end,
      };

      console.log("📝 Creating instance:", instanceData);

      const { data: newInstance, error: insertError } = await supabase
        .from("tasks")
        .insert(instanceData)
        .select();

      if (insertError) {
        console.error("❌ Error creating instance:", insertError);
      } else {
        console.log("✅ Instance created successfully:", newInstance);
        instancesCreated++;
      }
    }

    // Update last run timestamp
    localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
    console.log(`\n🎉 Engine complete. Created ${instancesCreated} instances`);
    
    return instancesCreated;
  } catch (error) {
    console.error("💥 Recurring task engine error:", error);
    return 0;
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
