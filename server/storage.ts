import { 
  users, type User, type InsertUser,
  visitors, type Visitor, type InsertVisitor,
  libraryVisits, type LibraryVisit, type InsertLibraryVisit,
  VisitorType, Department, CheckStatus
} from "@shared/schema";
import bcrypt from "bcryptjs";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Visitor methods
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  getAllVisitors(): Promise<Visitor[]>;
  getVisitorsByDate(date: string): Promise<Visitor[]>;
  getVisitorById(id: number): Promise<Visitor | undefined>;
  getVisitorByIdNumber(idNumber: string): Promise<Visitor | undefined>;
  checkOutVisitor(id: number, timeOut: Date): Promise<Visitor | undefined>;
  getCheckedInVisitors(): Promise<Visitor[]>;
  getVisitorsByStatus(status: string): Promise<Visitor[]>;
  getVisitorsByTypeAndDate(type: VisitorType, date: string): Promise<Visitor[]>;
  getVisitorsByDepartmentAndDate(department: Department, date: string): Promise<Visitor[]>;
  updateResearcherFee(id: number, feePaid: boolean, ticketNumber: string): Promise<Visitor | undefined>;
  
  // Library visit methods
  createLibraryVisit(visit: InsertLibraryVisit): Promise<LibraryVisit>;
  getAllLibraryVisits(): Promise<LibraryVisit[]>;
  getLibraryVisitsByDate(date: string): Promise<LibraryVisit[]>;
  getLibraryVisitById(id: number): Promise<LibraryVisit | undefined>;
  getLibraryVisitsByVisitorId(visitorId: number): Promise<LibraryVisit[]>;
  getLibraryVisitByTicketNumber(ticketNumber: string): Promise<LibraryVisit | undefined>;
  checkOutLibraryVisit(id: number, checkOutTime: Date, notes?: string): Promise<LibraryVisit | undefined>;
  getCheckedInLibraryVisits(): Promise<LibraryVisit[]>;
  
  // Reporting methods
  getDailyVisitorSummary(date: string): Promise<{
    totalVisitors: number;
    generalVisitors: number;
    researchers: number;
    departments: Record<Department, number>;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private visitors: Map<number, Visitor>;
  private libraryVisits: Map<number, LibraryVisit>;
  
  private userCurrentId: number;
  private visitorCurrentId: number;
  private libraryVisitCurrentId: number;

  constructor() {
    this.users = new Map();
    this.visitors = new Map();
    this.libraryVisits = new Map();
    
    this.userCurrentId = 1;
    this.visitorCurrentId = 1;
    this.libraryVisitCurrentId = 1;
    
    // Seed default users for testing
    this.seedDefaultUsers();
  }
  
  private async seedDefaultUsers() {
    // Admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = {
      id: this.userCurrentId++,
      username: "admin",
      password: adminPassword,
      fullName: "System Administrator",
      role: "Admin",
      email: "admin@archives.gov.zw",
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(admin.id, admin);
    
    // Receptionist user
    const receptionistPassword = await bcrypt.hash("reception123", 10);
    const receptionist = {
      id: this.userCurrentId++,
      username: "reception",
      password: receptionistPassword,
      fullName: "Reception Staff",
      role: "Receptionist",
      email: "reception@archives.gov.zw",
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(receptionist.id, receptionist);
    
    // Accountant user
    const accountantPassword = await bcrypt.hash("accounts123", 10);
    const accountant = {
      id: this.userCurrentId++,
      username: "accounts",
      password: accountantPassword,
      fullName: "Accounts Staff",
      role: "Accountant",
      email: "accounts@archives.gov.zw",
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(accountant.id, accountant);
    
    // Library Officer user
    const libraryPassword = await bcrypt.hash("library123", 10);
    const libraryOfficer = {
      id: this.userCurrentId++,
      username: "library",
      password: libraryPassword,
      fullName: "Library Staff",
      role: "LibraryOfficer",
      email: "library@archives.gov.zw",
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(libraryOfficer.id, libraryOfficer);
    
    console.log("Default users seeded successfully");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...user,
      lastLogin: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Visitor methods
  async createVisitor(insertVisitor: InsertVisitor): Promise<Visitor> {
    const id = this.visitorCurrentId++;
    // Format date as YYYY-MM-DD for easier grouping
    const date = new Date(insertVisitor.timeIn).toISOString().split('T')[0];
    
    // Initialize optional fields with null values for type safety
    const visitor: Visitor = { 
      ...insertVisitor, 
      id, 
      status: "CheckedIn",
      date,
      timeOut: null,
      institute: insertVisitor.institute || null,
      researchArea: insertVisitor.researchArea || null,
      homeAddress: insertVisitor.homeAddress || null,
      ticketNumber: insertVisitor.ticketNumber || null,
      feePaid: insertVisitor.feePaid || null
    };
    
    this.visitors.set(id, visitor);
    return visitor;
  }
  
  async getAllVisitors(): Promise<Visitor[]> {
    return Array.from(this.visitors.values());
  }
  
  async getVisitorsByDate(date: string): Promise<Visitor[]> {
    return Array.from(this.visitors.values()).filter(
      (visitor) => visitor.date === date
    );
  }
  
  async getVisitorById(id: number): Promise<Visitor | undefined> {
    return this.visitors.get(id);
  }
  
  async getVisitorByIdNumber(idNumber: string): Promise<Visitor | undefined> {
    return Array.from(this.visitors.values()).find(
      (visitor) => visitor.idNumber === idNumber && visitor.status === "CheckedIn"
    );
  }
  
  async checkOutVisitor(id: number, timeOut: Date): Promise<Visitor | undefined> {
    const visitor = this.visitors.get(id);
    
    if (!visitor) {
      return undefined;
    }
    
    const updatedVisitor: Visitor = {
      ...visitor,
      timeOut,
      status: "CheckedOut"
    };
    
    this.visitors.set(id, updatedVisitor);
    return updatedVisitor;
  }
  
  async getCheckedInVisitors(): Promise<Visitor[]> {
    return Array.from(this.visitors.values()).filter(
      (visitor) => visitor.status === "CheckedIn"
    );
  }
  
  async getVisitorsByStatus(status: string): Promise<Visitor[]> {
    return Array.from(this.visitors.values()).filter(
      (visitor) => visitor.status === status
    );
  }
  
  async getVisitorsByTypeAndDate(type: VisitorType, date: string): Promise<Visitor[]> {
    return Array.from(this.visitors.values()).filter(
      (visitor) => visitor.visitorType === type && visitor.date === date
    );
  }
  
  async getVisitorsByDepartmentAndDate(department: Department, date: string): Promise<Visitor[]> {
    return Array.from(this.visitors.values()).filter(
      (visitor) => visitor.destination === department && visitor.date === date
    );
  }
  
  async updateResearcherFee(id: number, feePaid: boolean, ticketNumber: string): Promise<Visitor | undefined> {
    const visitor = this.visitors.get(id);
    
    if (!visitor) {
      return undefined;
    }
    
    if (visitor.visitorType !== "Researcher") {
      throw new Error("Only researchers can have fee status updated");
    }
    
    const updatedVisitor: Visitor = {
      ...visitor,
      feePaid,
      ticketNumber
    };
    
    this.visitors.set(id, updatedVisitor);
    return updatedVisitor;
  }
  
  // Library visit methods
  async createLibraryVisit(insertLibraryVisit: InsertLibraryVisit): Promise<LibraryVisit> {
    const id = this.libraryVisitCurrentId++;
    // Format date as YYYY-MM-DD for easier grouping
    const date = new Date(insertLibraryVisit.checkInTime).toISOString().split('T')[0];
    
    const libraryVisit: LibraryVisit = {
      ...insertLibraryVisit,
      id,
      status: "CheckedIn",
      date,
      checkOutTime: null,
      materialsRequested: insertLibraryVisit.materialsRequested || null,
      notes: null
    };
    
    this.libraryVisits.set(id, libraryVisit);
    return libraryVisit;
  }
  
  async getAllLibraryVisits(): Promise<LibraryVisit[]> {
    return Array.from(this.libraryVisits.values());
  }
  
  async getLibraryVisitsByDate(date: string): Promise<LibraryVisit[]> {
    return Array.from(this.libraryVisits.values()).filter(
      (visit) => visit.date === date
    );
  }
  
  async getLibraryVisitById(id: number): Promise<LibraryVisit | undefined> {
    return this.libraryVisits.get(id);
  }
  
  async getLibraryVisitsByVisitorId(visitorId: number): Promise<LibraryVisit[]> {
    return Array.from(this.libraryVisits.values()).filter(
      (visit) => visit.visitorId === visitorId
    );
  }
  
  async getLibraryVisitByTicketNumber(ticketNumber: string): Promise<LibraryVisit | undefined> {
    return Array.from(this.libraryVisits.values()).find(
      (visit) => visit.ticketNumber === ticketNumber && visit.status === "CheckedIn"
    );
  }
  
  async checkOutLibraryVisit(id: number, checkOutTime: Date, notes?: string): Promise<LibraryVisit | undefined> {
    const visit = this.libraryVisits.get(id);
    
    if (!visit) {
      return undefined;
    }
    
    const updatedVisit: LibraryVisit = {
      ...visit,
      checkOutTime,
      status: "CheckedOut",
      notes: notes || visit.notes
    };
    
    this.libraryVisits.set(id, updatedVisit);
    return updatedVisit;
  }
  
  async getCheckedInLibraryVisits(): Promise<LibraryVisit[]> {
    return Array.from(this.libraryVisits.values()).filter(
      (visit) => visit.status === "CheckedIn"
    );
  }
  
  // Reporting methods
  async getDailyVisitorSummary(date: string): Promise<{
    totalVisitors: number;
    generalVisitors: number;
    researchers: number;
    departments: Record<Department, number>;
  }> {
    const visitors = await this.getVisitorsByDate(date);
    
    const generalVisitors = visitors.filter(v => v.visitorType === "General").length;
    const researchers = visitors.filter(v => v.visitorType === "Researcher").length;
    
    // Initialize department counts
    const departments: Record<Department, number> = {
      "Records": 0,
      "Accounts": 0,
      "IT": 0,
      "Admin": 0,
      "Library": 0,
      "HR": 0,
      "Research": 0,
      "Oral": 0,
      "Secretary": 0
    };
    
    // Count visitors by department
    visitors.forEach(visitor => {
      if (visitor.destination in departments) {
        departments[visitor.destination as Department]++;
      }
    });
    
    return {
      totalVisitors: visitors.length,
      generalVisitors,
      researchers,
      departments
    };
  }
}

export const storage = new MemStorage();
