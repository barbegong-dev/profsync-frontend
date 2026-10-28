'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PieChart, Download, Filter, TrendingUp } from 'lucide-react';

interface ReportData {
    department_id: number;
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

export default function DeanReports() {
    const [reports, setReports] = useState<ReportData[]>([]);
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
        fetchReports();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [selectedDepartment]);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/api/departments');
            setDepartments(res.data);
        } catch (error) {
            console.error("Failed to fetch departments");
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = selectedDepartment ? { department_id: selectedDepartment } : {};
            const response = await api.get('/api/reports', { params });
            setReports(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading reports...</div>;

    const aggregate = reports.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        approved: acc.approved + curr.approved,
        pending: acc.pending + curr.pending,
        rejected: acc.rejected + curr.rejected
    }), { total: 0, approved: 0, pending: 0, rejected: 0 });

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h4 className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>TOTAL SUBMISSIONS</h4>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{aggregate.total}</p>
                </div>
                <div className="card" style={{ borderBottom: '4px solid var(--success)' }}>
                    <h4 className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>COMPLIANCE RATE</h4>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{aggregate.total ? Math.round((aggregate.approved / aggregate.total) * 100) : 0}%</p>
                </div>
                <div className="card" style={{ borderBottom: '4px solid var(--warning)' }}>
                    <h4 className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>PENDING REVIEW</h4>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{aggregate.pending}</p>
                </div>
                <div className="card" style={{ borderBottom: '4px solid var(--error)' }}>
                    <h4 className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>REJECTIONS</h4>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{aggregate.rejected}</p>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <h2>Departmental Compliance</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        <button className="btn btn-secondary" onClick={fetchReports}><Filter size={16} /> Filter</button>
                        <button className="btn btn-primary"><Download size={16} /> Export PDF</button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Total Documents</th>
                                <th>Approved</th>
                                <th>Pending</th>
                                <th>Rejected</th>
                                <th>Compliance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.department_id}>
                                    <td data-label="Department">Department #{report.department_id}</td>
                                    <td data-label="Total Documents">{report.total}</td>
                                    <td data-label="Approved" style={{ color: 'var(--success)' }}>{report.approved}</td>
                                    <td data-label="Pending" style={{ color: 'var(--warning)' }}>{report.pending}</td>
                                    <td data-label="Rejected" style={{ color: 'var(--error)' }}>{report.rejected}</td>
                                    <td data-label="Compliance">
                                        <div style={{ width: '100px', height: '8px', backgroundColor: 'rgba(36,35,100,0.08)', borderRadius: '4px', overflow: 'hidden', marginLeft: 'auto' }}>
                                            <div style={{
                                                width: `${(report.approved / report.total) * 100}%`,
                                                height: '100%',
                                                backgroundColor: 'var(--success)'
                                            }}></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
