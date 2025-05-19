import { useState } from "react";
import { Link, useLocation } from "wouter";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  
  // Determine active path for navigation
  const getActivePath = () => {
    if (location === "/" || location.startsWith("/reception")) return "/reception";
    return location;
  };
  
  const activePath = getActivePath();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 font-sans">
      <Header />
      
      {/* Main Navigation */}
      <nav className="bg-white shadow-md mb-6">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto">
            <Link 
              href="/reception"
              className={`whitespace-nowrap px-6 py-4 font-medium focus:outline-none border-b-2 ${
                activePath === "/reception" 
                  ? "text-gray-800 border-accent" 
                  : "text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-300"
              }`}
            >
              <i className="fas fa-desktop mr-2"></i>Reception Desk
            </Link>
            
            <Link 
              href="/accounts"
              className={`whitespace-nowrap px-6 py-4 font-medium focus:outline-none border-b-2 ${
                activePath === "/accounts" 
                  ? "text-gray-800 border-accent" 
                  : "text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-300"
              }`}
            >
              <i className="fas fa-money-bill-wave mr-2"></i>Accounts
            </Link>
            
            <Link 
              href="/library"
              className={`whitespace-nowrap px-6 py-4 font-medium focus:outline-none border-b-2 ${
                activePath === "/library" 
                  ? "text-gray-800 border-accent" 
                  : "text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-300"
              }`}
            >
              <i className="fas fa-book mr-2"></i>Library Control
            </Link>
            
            <Link 
              href="/reports"
              className={`whitespace-nowrap px-6 py-4 font-medium focus:outline-none border-b-2 ${
                activePath === "/reports" 
                  ? "text-gray-800 border-accent" 
                  : "text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-300"
              }`}
            >
              <i className="fas fa-chart-bar mr-2"></i>Reports
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 pb-12 flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}
