import React, { useState } from 'react';
import styles from './ReportFilters.module.css';
import { ChevronUp, ChevronDown, Filter, Calendar, X, Undo2, RefreshCw } from 'lucide-react';

export function ReportFilters() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateRangeVisible, setDateRangeVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleCalendar = () => setDateRangeVisible(!dateRangeVisible);

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    document.getElementById('reportType').selectedIndex = 0;
    document.getElementById('department').selectedIndex = 0;
    document.getElementById('staffMember').selectedIndex = 0;
    document.getElementById('performanceLevel').selectedIndex = 0;
    document.getElementById('sortBy').selectedIndex = 4;
  };

  const handleApply = () => {
    if (startDate && endDate) {
      setDateRangeVisible(false);
    }
  };

  return (
    <div className={`${styles.reportFilters} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.filterHeader} onClick={toggleCollapse}>
        <h3><Filter size={18} /> Report Filters</h3>
        {isCollapsed ? <ChevronDown /> : <ChevronUp />}
      </div>

      <div className={`${styles.filterContent} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="reportType">Report Type</label>
            <select id="reportType">
              <option value="staff">Staff Performance</option>
              <option value="appointments">Appointments</option>
              <option value="tests">Laboratory Tests</option>
              <option value="financial">Financial</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="department">Department</label>
            <select id="department">
              <option value="all">All Departments</option>
              <option value="laboratory">Laboratory</option>
              <option value="radiology">Radiology</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="reception">Reception</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Date Range</label>
            <div className={styles.dateRangePicker}>
              <div className={styles.dateRangeInput} onClick={toggleCalendar}>
                <Calendar size={16} />
                <span>{startDate && endDate ? `${startDate} - ${endDate}` : 'This Month'}</span>
              </div>

              {dateRangeVisible && (
                <div className={`${styles.dateRangeCalendar} ${styles.active}`}>
                  <div className={styles.calendarHeader}>
                    <h4>Select Date Range</h4>
                    <button onClick={toggleCalendar}><X size={16} /></button>
                  </div>

                  <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                      <label>Start Date</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className={styles.filterGroup}>
                      <label>End Date</label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.calendarActions}>
                    <button onClick={toggleCalendar}>Cancel</button>
                    <button onClick={handleApply}>Apply</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="staffMember">Staff Member</label>
            <select id="staffMember">
              <option value="all">All Staff</option>
              <option value="john">John Smith</option>
              <option value="sarah">Sarah Johnson</option>
              <option value="michael">Michael Chen</option>
              <option value="emily">Emily Davis</option>
              <option value="robert">Robert Wilson</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="performanceLevel">Performance Level</label>
            <select id="performanceLevel">
              <option value="all">All Levels</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="needsImprovement">Needs Improvement</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="sortBy">Sort By</label>
            <select id="sortBy">
              <option value="name">Name</option>
              <option value="department">Department</option>
              <option value="attendance">Attendance</option>
              <option value="tasks">Tasks</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button className={styles.secondaryBtn} onClick={handleReset}><Undo2 size={16} /> Reset</button>
          <button className={styles.primaryBtn}><RefreshCw size={16} /> Generate Report</button>
        </div>
      </div>
    </div>
  );
}
