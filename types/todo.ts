import type { Tables, Enums } from "./supabase";

export type TodoGroup = Enums<"todo_group">;
export type Todo = Tables<"todo_items">;
export type CustomGroup = Tables<"custom_groups">;
