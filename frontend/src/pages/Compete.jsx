import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TaskList from '../components/TaskList';

const Compete = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [navigate, token]);

  if (!token) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <TaskList />
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 64px)',
    padding: '40px 24px',
    background: '#0a0a0f',
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 64px)',
    background: '#0a0a0f',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.06)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};

export default Compete;