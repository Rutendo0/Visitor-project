import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function Header() {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  
  useEffect(() => {
    const updateDateTime = () => {
      const formattedDateTime = format(new Date(), "EEEE, dd MMM yyyy HH:mm");
      setCurrentDateTime(formattedDateTime);
    };
    
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <svg 
              className="h-16 w-16 mr-4 bg-white rounded p-1"
              viewBox="0 0 100 100" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="45" fill="#edcb23" />
              <path d="M50 10 L85 85 L15 85 Z" fill="#d4351c" />
              <path d="M50 20 L75 75 L25 75 Z" fill="#f2f2f2" />
              <path d="M50 30 L65 65 L35 65 Z" fill="#006400" />
              <circle cx="50" cy="48" r="10" fill="#000" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold">National Archives of Zimbabwe</h1>
              <p className="text-sm">Visitor Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span><i className="fas fa-user mr-2"></i>Staff Portal</span>
            <span className="bg-secondary py-1 px-3 rounded">{currentDateTime}</span>
            <button 
              onClick={() => window.location.href = '/api/auth/logout'} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
