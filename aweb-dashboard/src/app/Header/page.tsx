'use client';

import { FaTint, FaPhoneAlt, FaUserShield } from 'react-icons/fa';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
        
        {/* Branding & Logo Area */}
        <div className="flex items-center gap-3 mb-2 md:mb-0">
          <div className="bg-red-600 p-2 rounded-lg shadow-md animate-pulse">
            <FaTint className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">
              Datajji Bhale
            </h1>
            <p className="text-red-600 font-bold text-xs tracking-[0.2em] uppercase">
              Blood Bank & Storage Unit
            </p>
          </div>
        </div>

        {/* Action & Contact Info */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end border-r border-gray-200 pr-6">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Emergency Helpline
            </span>
            <a 
              href="tel:+910000000000" 
              className="text-gray-800 font-bold flex items-center gap-2 hover:text-red-600 transition-colors"
            >
              <FaPhoneAlt size={12} className="text-red-500" /> 
              +91 000-000-0000
            </a>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 text-gray-600 shadow-sm">
            <FaUserShield className="text-red-500" size={14} />
            <span className="text-xs font-bold uppercase tracking-tighter">Admin Portal</span>
          </div>
        </div>

      </div>
    </header>
  );
}