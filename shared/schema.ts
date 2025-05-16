import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const UserRoleEnum = z.enum([
  "Admin",
  "Receptionist",
  "Accountant",
  "LibraryOfficer"
]);

export type UserRole = z.infer<typeof UserRoleEnum>;

// Base User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // Admin, Receptionist, Accountant, LibraryOfficer
  email: text("email"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Department enum
export const DepartmentEnum = z.enum([
  "Records",
  "Accounts",
  "IT",
  "Admin",
  "Library",
  "HR",
  "Research",
  "Oral",
  "Secretary"
]);

export type Department = z.infer<typeof DepartmentEnum>;

// Visitor types enum
export const VisitorTypeEnum = z.enum([
  "General",
  "Researcher"
]);

export type VisitorType = z.infer<typeof VisitorTypeEnum>;

// Visitor check-in status
export const CheckStatus = z.enum([
  "CheckedIn",
  "CheckedOut"
]);

export type VisitorStatus = z.infer<typeof CheckStatus>;

// Visitors schema
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  idNumber: text("id_number").notNull(),
  phoneNumber: text("phone_number").notNull(),
  visitorType: text("visitor_type").notNull(), // "General" or "Researcher"
  destination: text("destination").notNull(), // Department
  timeIn: timestamp("time_in").notNull(),
  timeOut: timestamp("time_out"),
  status: text("status").notNull().default("CheckedIn"), // "CheckedIn" or "CheckedOut"
  // Researcher specific fields (optional for general visitors)
  institute: text("institute"),
  researchArea: text("research_area"),
  homeAddress: text("home_address"),
  // For library tracking
  ticketNumber: text("ticket_number"),
  feePaid: boolean("fee_paid").default(false),
  date: text("date").notNull(), // Date in YYYY-MM-DD format for easy grouping
});

export const insertVisitorSchema = createInsertSchema(visitors).omit({
  id: true,
  status: true,
  date: true,
});

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitors.$inferSelect;

// Library check-in/check-out
export const libraryVisits = pgTable("library_visits", {
  id: serial("id").primaryKey(),
  visitorId: integer("visitor_id").notNull(),
  ticketNumber: text("ticket_number").notNull(),
  specificStudyArea: text("specific_study_area").notNull(),
  materialsRequested: text("materials_requested"),
  controlOfficer: text("control_officer").notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  status: text("status").notNull().default("CheckedIn"), // "CheckedIn" or "CheckedOut"
  notes: text("notes"),
  date: text("date").notNull(), // Date in YYYY-MM-DD format for easy grouping
});

export const insertLibraryVisitSchema = createInsertSchema(libraryVisits).omit({
  id: true,
  status: true,
  date: true,
});

export type InsertLibraryVisit = z.infer<typeof insertLibraryVisitSchema>;
export type LibraryVisit = typeof libraryVisits.$inferSelect;
