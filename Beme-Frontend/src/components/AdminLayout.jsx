// components/AdminLayout.jsx
import { useState } from "react";
import { Menu, X, Bell, User } from "lucide-react"; // or use your own icons

export default function AdminLayout({ children, title, subtitle, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 
        transition-transform lg:translate-x-0 lg:static lg:inset-0`}>
        
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              B
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Beme</h1>
              <p className="text-xs text-gray-500 -mt-1">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            <a href="/admin" className="flex items-center gap-3 px-4 py-3 text-sm font-medium bg-green-50 text-green-700 rounded-2xl">
              <span>📦</span> Products
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-2xl">
              <span>👥</span> Staff
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-2xl">
              <span>📊</span> Orders
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-2xl">
              <span>⚙️</span> Settings
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="font-semibold text-xl">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell size={20} className="text-gray-500" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                3
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium text-sm">{user?.displayName || "Admin"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="w-9 h-9 bg-gray-200 rounded-full overflow-hidden">
                <img src={user?.photoURL || "/default-avatar.png"} alt="User" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}