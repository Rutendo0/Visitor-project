import { 
  users, type User, type InsertUser,
  visitors, type Visitor, type InsertVisitor,
  libraryVisits, type LibraryVisit, type InsertLibraryVisit,
  VisitorType, Department, CheckStatus
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Visitor methods
  async createVisitor(insertVisitor: InsertVisitor): Promise<Visitor> {
    const id = this.visitorCurrentId++;
    // Format date as YYYY-MM-DD for easier grouping
    const date = new Date(insertVisitor.timeIn).toISOString().split('T')[0];
    
    const visitor: Visitor = { 
      ...insertVisitor, 
      id, 
      status: "CheckedIn",
      date
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
  
  // Library visit methods
  async createLibraryVisit(insertLibraryVisit: InsertLibraryVisit): Promise<LibraryVisit> {
    const id = this.libraryVisitCurrentId++;
    // Format date as YYYY-MM-DD for easier grouping
    const date = new Date(insertLibraryVisit.checkInTime).toISOString().split('T')[0];
    
    const libraryVisit: LibraryVisit = {
      ...insertLibraryVisit,
      id,
      status: "CheckedIn",
      date
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
