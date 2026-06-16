import React, { useState } from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 72 : 250;

  return (
    <div style={styles.wrapper}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main
        className="dashboard-main-content"
        style={{
          ...styles.main,
          marginLeft: sidebarWidth,
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        {children}
      </main>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg-primary, #0a0a0f)',
  },
  main: {
    flex: 1,
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minHeight: '100vh',
    overflowX: 'hidden',
  },
};

export default DashboardLayout;
