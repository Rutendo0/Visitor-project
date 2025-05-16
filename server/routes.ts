import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertVisitorSchema, 
  insertLibraryVisitSchema,
  insertUserSchema,
  CheckStatus,
  UserRoleEnum
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Role-based access control middleware
const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (roles.includes(req.session.user.role)) {
      return next();
    }
    
    res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  };
};

// This type is needed for express-session
declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      username: string;
      fullName: string;
      role: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'national-archives-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    },
    genid: () => uuidv4()
  }));

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Create session
      req.session.user = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      };
      
      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Error during login" });
    }
  });
  
  app.get("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  
  app.get("/api/auth/me", isAuthenticated, (req: Request, res: Response) => {
    res.json({ user: req.session.user });
  });
  
  // User management routes (admin only)
  app.post("/api/users", hasRole(["Admin"]), async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Don't send the password back
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  // Visitor routes - Reception
  app.get("/api/visitors", async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const status = req.query.status as string;
      const type = req.query.type as string;
      
      let visitors;
      if (status) {
        visitors = await storage.getVisitorsByStatus(status);
      } else if (type) {
        visitors = await storage.getVisitorsByTypeAndDate(type as any, date);
      } else {
        visitors = await storage.getVisitorsByDate(date);
      }
      
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ message: "Error fetching visitors" });
    }
  });
  
  app.get("/api/visitors/checkedin", async (_req: Request, res: Response) => {
    try {
      const visitors = await storage.getCheckedInVisitors();
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ message: "Error fetching checked-in visitors" });
    }
  });
  
  app.get("/api/visitors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const visitor = await storage.getVisitorById(id);
      
      if (!visitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ message: "Error fetching visitor" });
    }
  });
  
  app.get("/api/visitors/idnumber/:idNumber", async (req: Request, res: Response) => {
    try {
      const idNumber = req.params.idNumber;
      const visitor = await storage.getVisitorByIdNumber(idNumber);
      
      if (!visitor) {
        return res.status(404).json({ message: "No active visitor found with this ID number" });
      }
      
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ message: "Error fetching visitor" });
    }
  });
  
  app.post("/api/visitors", async (req: Request, res: Response) => {
    try {
      const visitorData = insertVisitorSchema.parse(req.body);
      const visitor = await storage.createVisitor(visitorData);
      res.status(201).json(visitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid visitor data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating visitor" });
    }
  });
  
  app.patch("/api/visitors/:id/checkout", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const timeOut = new Date();
      
      const visitor = await storage.checkOutVisitor(id, timeOut);
      
      if (!visitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ message: "Error checking out visitor" });
    }
  });
  
  // Fee payment route for researchers
  app.patch("/api/visitors/:id/fee", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { feePaid, ticketNumber } = req.body;
      
      const visitor = await storage.updateResearcherFee(id, feePaid, ticketNumber);
      
      if (!visitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ message: "Error updating researcher fee status" });
    }
  });
  
  // Library routes
  app.get("/api/library/visits", async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const visits = await storage.getLibraryVisitsByDate(date);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: "Error fetching library visits" });
    }
  });
  
  app.get("/api/library/visits/checkedin", async (_req: Request, res: Response) => {
    try {
      const visits = await storage.getCheckedInLibraryVisits();
      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: "Error fetching checked-in library visits" });
    }
  });
  
  app.get("/api/library/visits/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const visit = await storage.getLibraryVisitById(id);
      
      if (!visit) {
        return res.status(404).json({ message: "Library visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      res.status(500).json({ message: "Error fetching library visit" });
    }
  });
  
  app.get("/api/library/visits/visitor/:visitorId", async (req: Request, res: Response) => {
    try {
      const visitorId = parseInt(req.params.visitorId);
      const visits = await storage.getLibraryVisitsByVisitorId(visitorId);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ message: "Error fetching library visits" });
    }
  });
  
  app.get("/api/library/visits/ticket/:ticketNumber", async (req: Request, res: Response) => {
    try {
      const ticketNumber = req.params.ticketNumber;
      const visit = await storage.getLibraryVisitByTicketNumber(ticketNumber);
      
      if (!visit) {
        return res.status(404).json({ message: "No active library visit found with this ticket number" });
      }
      
      res.json(visit);
    } catch (error) {
      res.status(500).json({ message: "Error fetching library visit" });
    }
  });
  
  app.post("/api/library/visits", async (req: Request, res: Response) => {
    try {
      const visitData = insertLibraryVisitSchema.parse(req.body);
      const visit = await storage.createLibraryVisit(visitData);
      res.status(201).json(visit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid library visit data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating library visit" });
    }
  });
  
  app.patch("/api/library/visits/:id/checkout", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const checkOutTime = new Date();
      const notes = req.body.notes;
      
      const visit = await storage.checkOutLibraryVisit(id, checkOutTime, notes);
      
      if (!visit) {
        return res.status(404).json({ message: "Library visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      res.status(500).json({ message: "Error checking out library visit" });
    }
  });
  
  // Reports routes
  app.get("/api/reports/daily-summary", async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const summary = await storage.getDailyVisitorSummary(date);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Error generating daily summary report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
