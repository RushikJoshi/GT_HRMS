import React, { useState, useEffect } from 'react';
import { Pagination, notification } from 'antd';
import api from '../../utils/api';
import {
  Search, FileText
} from '../../components/Icons';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, Pending, Approved, Rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchLeaves();
  }, [currentPage]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/hr/leaves/requests?page=${currentPage}&limit=${pageSize}`);
      
      // Handle both paginated and non-paginated responses
      if (res.data.data) {
        // New format with pagination
        setLeaves(res.data.data);
      } else {
        // Fallback for array response
        setLeaves(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch leaves", err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredLeaves = leaves.filter(l => {
    const matchesFilter = filter === 'All' || l.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      l.employee?.firstName?.toLowerCase().includes(searchLower) ||
      l.employee?.lastName?.toLowerCase().includes(searchLower) ||
      l.employee?.employeeId?.toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage employee leave requests</p>
        </div>
        <div className="flex gap-3">
          {/* Stats cards could go here */}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === s
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium uppercas text-xs">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((leave) => {
                  const start = formatDateDDMMYYYY(leave.startDate);
                  const end = formatDateDDMMYYYY(leave.endDate);

                  return (
                    <tr key={leave._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {leave.employee?.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {leave.employee?.employeeId || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-gray-700">{start}</span>
                          <span className="text-gray-400">to</span>
                          <span className="font-medium text-gray-700">{end}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 truncate max-w-[200px]" title={leave.reason}>
                          {leave.reason || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filteredLeaves.length > pageSize && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredLeaves.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
