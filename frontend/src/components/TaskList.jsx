import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/tasks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setTasks(response.data.reverse());
      } catch (error) {
        setError('Error fetching tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner}></div>
        <p style={{ color: '#5a5a66', marginTop: '16px', fontSize: '0.9rem' }}>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>All Challenges</h2>
          <p style={styles.subtitle}>{tasks.length} tasks available</p>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          <span>⚠</span> {error}
        </div>
      )}

      <div style={styles.taskList}>
        {tasks.map((task, i) => (
          <div
            key={task._id}
            style={{
              ...styles.taskCard,
              animationDelay: `${i * 0.05}s`,
            }}
            onClick={() => navigate(`/task/${task._id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(139, 92, 246, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.cardAccent}></div>
            <div style={styles.cardBody}>
              <div style={styles.cardTop}>
                <h3 style={styles.cardTitle}>{task.title}</h3>
                <span style={styles.cardArrow}>→</span>
              </div>
              <p style={styles.cardDesc}>
                {task.description.length > 120
                  ? task.description.substring(0, 120) + '...'
                  : task.description}
              </p>
              <div style={styles.cardMeta}>
                <span style={styles.metaItem}>
                  <span style={{ opacity: 0.6 }}>📝</span> {task.testCases?.length || 0} test cases
                </span>
                {task.author && (
                  <span style={styles.metaItem}>
                    <span style={{ opacity: 0.6 }}>by</span> {task.author.username || 'Unknown'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && !error && (
        <div style={styles.emptyState}>
          <span style={{ fontSize: '3rem', marginBottom: '16px', display: 'block' }}>📋</span>
          <h3 style={{ color: '#f1f1f3', marginBottom: '8px', fontWeight: '600' }}>No tasks yet</h3>
          <p style={{ color: '#5a5a66', fontSize: '0.9rem' }}>Check back later for new challenges.</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '8px 0',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.06)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#f1f1f3',
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#5a5a66',
    fontWeight: '400',
  },
  error: {
    padding: '12px 16px',
    background: 'rgba(244, 63, 94, 0.08)',
    border: '1px solid rgba(244, 63, 94, 0.15)',
    borderRadius: '10px',
    color: '#f43f5e',
    fontSize: '0.85rem',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskCard: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    overflow: 'hidden',
    animation: 'fadeIn 0.4s ease forwards',
    opacity: 0,
  },
  cardAccent: {
    width: '4px',
    background: 'linear-gradient(180deg, #8b5cf6, #06b6d4)',
    flexShrink: 0,
  },
  cardBody: {
    padding: '20px 24px',
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#f1f1f3',
    lineHeight: '1.3',
  },
  cardArrow: {
    color: '#5a5a66',
    fontSize: '1.1rem',
    flexShrink: 0,
    marginLeft: '12px',
    transition: 'color 0.2s ease',
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: '#6b6b78',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '0.75rem',
    color: '#5a5a66',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 24px',
  },
};

export default TaskList;