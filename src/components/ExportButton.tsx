// src/components/ExportButton.tsx
'use client';

import * as React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Menu, Transition, MenuButton, MenuItem } from '@headlessui/react';
import { PortfolioStock } from '@/types/portfolio';
import { exportToCsv, exportToExcel, exportToPrint } from '@/lib/exportUtils';

interface ExportButtonProps {
  portfolio: PortfolioStock[];
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ portfolio, className = '' }) => {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handleExport = (type: 'csv' | 'excel' | 'print'): void => {
    if (!portfolio.length) return;
    
    switch (type) {
      case 'csv':
        exportToCsv(portfolio);
        break;
      case 'excel':
        exportToExcel(portfolio);
        break;
      case 'print':
        exportToPrint(portfolio, printRef);
        break;
    }
  };

  return (
    <div className={className}>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <MenuButton
            className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
          >
            Export
            <ArrowDownTrayIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          </MenuButton>
        </div>
        <Transition
          as={React.Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-white/10">
            <div className="px-1 py-1">
              <MenuItem>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={() => handleExport('csv')}
                    className={`${
                      active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    Export as CSV
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={() => handleExport('excel')}
                    className={`${
                      active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    Export as Excel
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={() => handleExport('print')}
                    className={`${
                      active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-white'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    Print View
                  </button>
                )}
              </MenuItem>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
      <div className="hidden">
        <div ref={printRef} id="print-area" />
      </div>
    </div>
  );
};

export default ExportButton;
